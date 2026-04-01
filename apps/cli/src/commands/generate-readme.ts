import ora from 'ora';
import chalk from 'chalk';
import fs from 'fs';
import path from 'path';

import {
  evaluateReadmeQuality,
  README_PERSONAS,
  runSemanticReadmePipeline,
} from '@readme-gen/analyzer';
import { LocalAnalyzerService } from '../services/analyzer.service.js';
import { configManager } from '../config/config-manager.js';
import { DEFAULT_PERSONA } from '../constants/personas.js';

const personaHint = README_PERSONAS.join(', ');

export async function generateReadmeSemanticCommand(options: {
  provider?: 'groq' | 'gemini';
  output?: string;
  tone?: string;
  persona?: string;
  model?: string;
  hero?: string;
  context?: string;
  timeoutMs?: number;
  retries?: number;
  maxCharsPerChunk?: number;
  files?: string[];
}) {
  const cfgProvider = configManager.get('provider');
  const provider =
    options.provider ||
    (cfgProvider === 'gemini' ? 'gemini' : 'groq');
  const outputFile = options.output || 'README.md';

  const geminiKey =
    process.env.GOOGLE_GENERATIVE_AI_API_KEY ||
    configManager.get('geminiKey') ||
    configManager.get('openaiKey') ||
    '';
  const groqKey = process.env.GROQ_API_KEY || configManager.get('groqKey') || '';

  const apiKey = provider === 'gemini' ? geminiKey : groqKey;

  if (!apiKey) {
    console.log(chalk.red(`\n❌ Missing API key for provider "${provider}".\n`));
    console.log(chalk.yellow('Set env vars or run CLI init/config:'));
    console.log(chalk.yellow('- GROQ_API_KEY or config groqKey (Groq)'));
    console.log(chalk.yellow('- GOOGLE_GENERATIVE_AI_API_KEY or readmegen config geminiKey (Gemini)'));
    return;
  }

  const configuredModel = configManager.get('model');
  const modelOverride = options.model?.trim();
  const defaultGemini = 'gemini-2.5-flash';
  const defaultGroq = 'llama-3.1-8b-instant';
  let model = modelOverride || '';
  if (!model) {
    const c = configuredModel || '';
    const looksGemini = c.toLowerCase().includes('gemini');
    if (provider === 'gemini' && looksGemini) model = c;
    else if (provider === 'groq' && c && !looksGemini && !c.toLowerCase().startsWith('gpt')) model = c;
  }
  if (!model) model = provider === 'gemini' ? defaultGemini : defaultGroq;

  const persona = options.persona?.trim() || DEFAULT_PERSONA;
  if (!README_PERSONAS.includes(persona as (typeof README_PERSONAS)[number])) {
    console.log(chalk.yellow(`\n⚠️ Unknown persona "${persona}". Expected one of: ${personaHint}\n`));
  }

  const spinner = ora('🔍 Analyzing local codebase (semantic pipeline)...').start();
  try {
    const analyzer = new LocalAnalyzerService();
    const analysis = await analyzer.analyze(options.files || []);
    spinner.succeed(`Analysis complete: ${analysis.summary.name}`);

    spinner.start(`🧠 Building README (${provider} · ${model})…`);
    const result = await runSemanticReadmePipeline(analysis, {
      llm: {
        provider,
        apiKey,
        model,
        timeoutMs: options.timeoutMs ?? 45_000,
        retries: options.retries ?? 2,
        temperature: 0.1,
      },
      maxCharsPerChunk: options.maxCharsPerChunk ?? 24_000,
      additionalContext: options.context,
      heroImageUrl: options.hero,
      tone: options.tone || 'professional',
      persona,
    });
    spinner.succeed('README generated from semantic JSON!');

    const outPath = path.join(process.cwd(), outputFile);
    fs.writeFileSync(outPath, result.readme, 'utf8');
    console.log(chalk.green(`\n✨ Written: ${outPath}`));

    const quality = evaluateReadmeQuality(result.readme);
    console.log(chalk.blue(`\n📊 Quality score: ${quality.score}/100`));
    for (const r of quality.reasons.slice(0, 8)) console.log(chalk.gray(`- ${r}`));

    console.log(
      chalk.gray(
        `\nEvidence chunks used: ${result.evidenceChunks.map((c) => `${c.id}~${c.approxTokens}t`).join(', ')}`,
      ),
    );
    console.log(chalk.dim(`Model: ${model} · Persona: ${persona}`));
    console.log();
  } catch (err: any) {
    spinner.fail(err?.message || 'Pipeline failed');
    process.exit(1);
  }
}
