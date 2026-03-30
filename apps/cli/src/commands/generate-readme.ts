import ora from 'ora';
import chalk from 'chalk';
import fs from 'fs';
import path from 'path';

import { LocalAnalyzerService } from '../services/analyzer.service.js';
import { configManager } from '../config/config-manager.js';
import { evaluateReadmeQuality, runSemanticReadmePipeline } from '@readme-gen/analyzer';

export async function generateReadmeSemanticCommand(options: {
  provider?: 'groq' | 'gemini';
  output?: string;
  tone?: string;
  hero?: string;
  context?: string;
  timeoutMs?: number;
  retries?: number;
  maxCharsPerChunk?: number;
  files?: string[];
}) {
  const provider = options.provider || (configManager.get('provider') as any) || 'groq';
  const outputFile = options.output || 'README.md';

  const apiKey =
    provider === 'gemini'
      ? (process.env.GOOGLE_GENERATIVE_AI_API_KEY || configManager.get('openaiKey') || '')
      : (process.env.GROQ_API_KEY || configManager.get('groqKey') || '');

  if (!apiKey) {
    console.log(chalk.red(`\n❌ Missing API key for provider "${provider}".\n`));
    console.log(chalk.yellow('Set env vars or run CLI init/config:'));
    console.log(chalk.yellow('- GROQ_API_KEY or config groqKey'));
    console.log(chalk.yellow('- GOOGLE_GENERATIVE_AI_API_KEY for gemini'));
    return;
  }

  const spinner = ora('🔍 Analyzing local codebase (semantic pipeline)...').start();
  try {
    const analyzer = new LocalAnalyzerService();
    const analysis = await analyzer.analyze(options.files || []);
    spinner.succeed(`Analysis complete: ${analysis.summary.name}`);

    spinner.start('🧠 Building semantic understanding (multi-stage LLM)...');
    const result = await runSemanticReadmePipeline(analysis, {
      llm: {
        provider,
        apiKey,
        timeoutMs: options.timeoutMs ?? 45_000,
        retries: options.retries ?? 2,
        temperature: 0.1,
      },
      maxCharsPerChunk: options.maxCharsPerChunk ?? 24_000,
      additionalContext: options.context,
      heroImageUrl: options.hero,
      tone: options.tone || 'professional',
    });
    spinner.succeed('README generated from semantic JSON!');

    const outPath = path.join(process.cwd(), outputFile);
    fs.writeFileSync(outPath, result.readme, 'utf8');
    console.log(chalk.green(`\n✨ Written: ${outPath}`));

    const quality = evaluateReadmeQuality(result.readme);
    console.log(chalk.blue(`\n📊 Quality score: ${quality.score}/100`));
    for (const r of quality.reasons.slice(0, 8)) console.log(chalk.gray(`- ${r}`));

    console.log(chalk.gray(`\nEvidence chunks used: ${result.evidenceChunks.map(c => `${c.id}~${c.approxTokens}t`).join(', ')}`));
    console.log();
  } catch (err: any) {
    spinner.fail(err?.message || 'Pipeline failed');
    process.exit(1);
  }
}

