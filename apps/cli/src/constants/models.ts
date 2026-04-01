/**
 * Model IDs accepted by Groq OpenAI-compatible API.
 * @see https://console.groq.com/docs/models
 */
export const GROQ_MODELS = [
  'llama-3.1-8b-instant',
  'llama-3.3-70b-versatile',
  'llama-3.3-8b-instant',
  'mixtral-8x7b-32768',
  'gemma2-9b-it',
] as const;

/**
 * Gemini model IDs (Generative Language API v1beta).
 * @see https://ai.google.dev/gemini-api/docs/models
 */
export const GEMINI_MODELS = [
  'gemini-2.5-flash',
  'gemini-2.0-flash',
  'gemini-2.0-flash-lite',
  'gemini-1.5-flash',
  'gemini-1.5-pro',
] as const;

export const OPENAI_MODELS = ['gpt-4o', 'gpt-4o-mini', 'gpt-4-turbo'] as const;
