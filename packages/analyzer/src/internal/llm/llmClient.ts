export type LlmProviderId = 'groq' | 'gemini';

export interface LlmClientOptions {
  provider: LlmProviderId;
  /**
   * For Groq: GROQ_API_KEY
   * For Gemini: GOOGLE_GENERATIVE_AI_API_KEY
   */
  apiKey: string;
  /**
   * Deterministic-ish outputs.
   */
  temperature?: number;
  /**
   * Request timeout (ms).
   */
  timeoutMs?: number;
  /**
   * Retry count for transient errors (429/5xx/timeouts).
   */
  retries?: number;
  /**
   * Model name override.
   */
  model?: string;
  /**
   * Minimum wait time between outbound LLM requests for a single pipeline run.
   */
  requestDelayMs?: number;
}

export class LlmError extends Error {
  public readonly status?: number;
  public readonly provider: LlmProviderId;
  public readonly retriable: boolean;
  constructor(provider: LlmProviderId, message: string, opts: { status?: number; retriable?: boolean } = {}) {
    super(message);
    this.name = 'LlmError';
    this.provider = provider;
    this.status = opts.status;
    this.retriable = Boolean(opts.retriable);
  }
}

function previewText(text: string, max = 220) {
  const normalized = text.replace(/\s+/g, ' ').trim();
  return normalized.length > max ? `${normalized.slice(0, max)}...` : normalized;
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

function isRetriableStatus(status?: number) {
  return status === 408 || status === 409 || status === 425 || status === 429 || (status != null && status >= 500);
}

function withTimeout<T>(timeoutMs: number, fn: (signal: AbortSignal) => Promise<T>): Promise<T> {
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), timeoutMs);
  return fn(controller.signal).finally(() => clearTimeout(t));
}

export interface GenerateJsonOptions {
  /**
   * Provide a JSON schema-ish shape in plain English; we enforce JSON-only output.
   */
  jsonShapeHint: string;
}

export class LlmClient {
  private readonly provider: LlmProviderId;
  private readonly apiKey: string;
  private readonly temperature: number;
  private readonly timeoutMs: number;
  private readonly retries: number;
  private readonly model?: string;
  private readonly requestDelayMs: number;
  private requestQueue: Promise<void> = Promise.resolve();
  private lastRequestAt = 0;

  constructor(opts: LlmClientOptions) {
    this.provider = opts.provider;
    this.apiKey = opts.apiKey;
    this.temperature = opts.temperature ?? 0.1;
    this.timeoutMs = opts.timeoutMs ?? 45_000;
    this.retries = opts.retries ?? 2;
    this.model = opts.model;
    this.requestDelayMs = Math.max(0, opts.requestDelayMs ?? 0);
  }

  public async generateText(prompt: string): Promise<string> {
    return this.scheduleRequest(() =>
      this.callWithRetry(async (signal) => {
        if (this.provider === 'groq') return await this.callGroq(prompt, signal);
        return await this.callGemini(prompt, signal);
      }),
    );
  }

  public async generateJson<T>(prompt: string, options: GenerateJsonOptions): Promise<T> {
    const jsonPrompt = [
      prompt.trim(),
      '',
      '## OUTPUT FORMAT',
      'Return JSON ONLY. No markdown. No code fences. No commentary.',
      options.jsonShapeHint.trim(),
    ].join('\n');

    const raw = await this.generateText(jsonPrompt);
    try {
      const parsed = this.safeJsonParse(raw);
      return parsed as T;
    } catch (err: any) {
      const hint =
        this.requestDelayMs > 0
          ? `Current requestDelayMs=${this.requestDelayMs}.`
          : 'Try adding a delay between LLM calls (for CLI: --llm-delay-ms 30000).';
      throw new LlmError(
        this.provider,
        `Model returned invalid JSON. This often happens when a response is truncated or a provider rate-limit message leaks into the output. ${hint} Response preview: ${previewText(raw)}`,
        { retriable: false },
      );
    }
  }

  private safeJsonParse(text: string): unknown {
    const trimmed = text.trim();
    const start = trimmed.indexOf('{');
    const end = trimmed.lastIndexOf('}');
    if (start >= 0 && end > start) {
      const candidate = trimmed.slice(start, end + 1);
      try {
        return JSON.parse(candidate);
      } catch {
        // fallthrough
      }
    }
    // Try raw
    return JSON.parse(trimmed);
  }

  private async callWithRetry<T>(fn: (signal: AbortSignal) => Promise<T>): Promise<T> {
    let attempt = 0;
    let lastErr: unknown;
    const max = Math.max(0, this.retries);

    while (attempt <= max) {
      try {
        return await withTimeout(this.timeoutMs, fn);
      } catch (err: any) {
        lastErr = err;
        const status = typeof err?.status === 'number' ? err.status : undefined;
        const retriable = err?.name === 'AbortError' || isRetriableStatus(status);
        if (!retriable || attempt === max) throw err;
        const backoff = 500 * Math.pow(2, attempt) + Math.floor(Math.random() * 250);
        await sleep(backoff);
        attempt += 1;
      }
    }
    throw lastErr instanceof Error ? lastErr : new Error('LLM call failed');
  }

  private async scheduleRequest<T>(task: () => Promise<T>): Promise<T> {
    const run = async () => {
      if (this.requestDelayMs > 0) {
        const elapsed = Date.now() - this.lastRequestAt;
        const remaining = this.requestDelayMs - elapsed;
        if (remaining > 0) {
          await sleep(remaining);
        }
      }

      this.lastRequestAt = Date.now();
      return await task();
    };

    const scheduled = this.requestQueue.catch(() => undefined).then(run);
    this.requestQueue = scheduled.then(() => undefined, () => undefined);
    return scheduled;
  }

  /**
   * Groq is OpenAI-compatible: https://console.groq.com/docs/openai
   */
  private async callGroq(prompt: string, signal: AbortSignal): Promise<string> {
    const model = this.model || 'llama-3.1-8b-instant';
    const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model,
        temperature: this.temperature,
        messages: [
          { role: 'system', content: 'You are a precise software documentation analyst. Follow instructions exactly.' },
          { role: 'user', content: prompt },
        ],
      }),
      signal,
    });

    if (!res.ok) {
      const body = await res.text().catch(() => '');
      const err = new LlmError('groq', `Groq error ${res.status}: ${body.slice(0, 500)}`, {
        status: res.status,
        retriable: isRetriableStatus(res.status),
      });
      throw err;
    }

    const data = await res.json() as any;
    const content = data?.choices?.[0]?.message?.content;
    if (typeof content !== 'string' || content.trim().length === 0) {
      throw new LlmError('groq', 'Groq returned empty content', { retriable: true });
    }
    return content;
  }

  /**
   * Gemini REST API: https://ai.google.dev/gemini-api/docs
   */
  private async callGemini(prompt: string, signal: AbortSignal): Promise<string> {
    const model = this.model || 'gemini-2.5-flash';
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(this.apiKey)}`;
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        generationConfig: {
          temperature: this.temperature,
        },
        contents: [
          {
            role: 'user',
            parts: [{ text: prompt }],
          },
        ],
      }),
      signal,
    });

    if (!res.ok) {
      const body = await res.text().catch(() => '');
      throw new LlmError('gemini', `Gemini error ${res.status}: ${body.slice(0, 500)}`, {
        status: res.status,
        retriable: isRetriableStatus(res.status),
      });
    }

    const data = await res.json() as any;
    const text = data?.candidates?.[0]?.content?.parts?.map((p: any) => p?.text).filter(Boolean).join('') || '';
    if (typeof text !== 'string' || text.trim().length === 0) {
      throw new LlmError('gemini', 'Gemini returned empty content', { retriable: true });
    }
    return text;
  }
}

