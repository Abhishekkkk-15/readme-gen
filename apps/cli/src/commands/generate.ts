import ora from 'ora';
import chalk from 'chalk';
import fs from 'fs';
import path from 'path';
import inquirer from 'inquirer';
import { Command } from 'commander';
import {
  evaluateReadmeQuality,
  README_PERSONAS,
  runSemanticReadmePipeline,
} from '@readme-gen/analyzer';
import { LocalAnalyzerService } from '../services/analyzer.service.js';
import { apiService } from '../services/api.service.js';
import { configManager } from '../config/config-manager.js';
import { DEFAULT_PERSONA, PERSONA_CLI_CHOICES } from '../constants/personas.js';
import { CLI_README_TEMPLATES, findCliTemplate } from '../constants/templates.js';

const personaHint = README_PERSONAS.join(', ');
type SemanticProvider = 'groq' | 'gemini';
type WriteMode = 'overwrite' | 'rewrite' | 'append';

function inferProviderFromModel(model?: string): SemanticProvider | undefined {
  const value = model?.trim().toLowerCase();
  if (!value) return undefined;
  if (value.includes('gemini')) return 'gemini';
  if (
    value.includes('llama') ||
    value.includes('mixtral') ||
    value.includes('qwen') ||
    value.includes('deepseek') ||
    value.includes('gemma')
  ) {
    return 'groq';
  }
  return undefined;
}

function resolveWriteMode(
  requestedMode: string | undefined,
  hasExistingReadme: boolean,
): WriteMode {
  if (requestedMode === 'overwrite' || requestedMode === 'rewrite' || requestedMode === 'append') {
    return requestedMode;
  }
  return hasExistingReadme ? 'rewrite' : 'overwrite';
}

function getSemanticProvider(optionsProvider?: string): SemanticProvider {
  const configured = configManager.get('provider');
  const provider = optionsProvider || (configured === 'gemini' ? 'gemini' : 'groq');
  if (provider !== 'groq' && provider !== 'gemini') {
    throw new Error(
      `Semantic generation supports only groq or gemini. Current provider is "${provider}". ` +
        `Use \`--provider groq\` or \`--provider gemini\`, or use template/nested mode with the backend flow.`,
    );
  }
  return provider;
}

function getSemanticApiKey(provider: SemanticProvider): string {
  const geminiKey =
    process.env.GOOGLE_GENERATIVE_AI_API_KEY ||
    configManager.get('geminiKey') ||
    configManager.get('openaiKey') ||
    '';
  const groqKey = process.env.GROQ_API_KEY || configManager.get('groqKey') || '';
  return provider === 'gemini' ? geminiKey : groqKey;
}

function getSemanticModel(provider: SemanticProvider, requestedModel?: string): string {
  const configuredModel = configManager.get('model');
  const modelOverride = requestedModel?.trim();
  const defaultGemini = 'gemini-2.5-flash';
  const defaultGroq = 'llama-3.1-8b-instant';
  let model = modelOverride || '';

  if (!model) {
    const configured = configuredModel || '';
    const looksGemini = configured.toLowerCase().includes('gemini');
    if (provider === 'gemini' && looksGemini) model = configured;
    else if (provider === 'groq' && configured && !looksGemini && !configured.toLowerCase().startsWith('gpt')) {
      model = configured;
    }
  }

  return model || (provider === 'gemini' ? defaultGemini : defaultGroq);
}

async function promptForManualFiles(existing: string[] = []): Promise<string[]> {
  if (existing.length > 0) return existing;
  const { addFiles } = await inquirer.prompt([
    {
      type: 'confirm',
      name: 'addFiles',
      message: 'Would you like to manually specify important files for deeper analysis?',
      default: false,
    },
  ]);

  if (!addFiles) return [];

  const { filesInput } = await inquirer.prompt([
    {
      type: 'input',
      name: 'filesInput',
      message: 'Enter file paths (comma-separated):',
      validate: (input: string) => input.trim().length > 0,
    },
  ]);

  return filesInput
    .split(',')
    .map((f: string) => f.trim())
    .filter(Boolean);
}

async function promptForReadmeOptions(
  selectedTone: string,
  selectedPersona: string,
  generateNested: boolean,
  allowTemplates: boolean,
  selectedTemplateId?: string,
  providedFlags?: Set<string>,
): Promise<{
  sections: string[];
  tone: string;
  persona: string;
  generateNested: boolean;
  templateId?: string;
}> {
  const questions: any[] = [
    {
      type: 'checkbox',
      name: 'sections',
      message: 'Select sections to include:',
      choices: [
        'Installation',
        'Usage',
        'API Reference',
        'Deployment',
        'Architecture',
        'Environment Variables',
        'Contributing',
        'License',
      ],
      default: ['Installation', 'Usage', 'Features', 'Contributing'],
      when: !providedFlags?.has('sections'),
    },
    {
      type: 'list',
      name: 'tone',
      message: 'Select README tone:',
      choices: [
        'professional',
        'friendly',
        'minimal',
        'enterprise',
        'humorous',
        'academic',
        'concise',
        'storytelling',
      ],
      default: selectedTone,
      when: !providedFlags?.has('tone'),
    },
    {
      type: 'list',
      name: 'persona',
      message: 'Select author persona (same options as the web app):',
      choices: PERSONA_CLI_CHOICES,
      default: selectedPersona,
      when: !providedFlags?.has('persona'),
    },
    {
      type: 'confirm',
      name: 'generateNested',
      message: 'Generate nested READMEs for sub-directories (Monorepos)?',
      default: generateNested,
      when: !providedFlags?.has('nested'),
    },
  ];

  if (allowTemplates) {
    questions.splice(3, 0, {
      type: 'list',
      name: 'templateId',
      message: 'Select a README template:',
      choices: [
        { name: 'None (semantic default)', value: 'none' },
        ...CLI_README_TEMPLATES.map((template) => ({
          name: `${template.name} (${template.id})`,
          value: template.id,
        })),
      ],
      default: selectedTemplateId || 'none',
      when: !providedFlags?.has('template'),
    });
  }

  const answers = await inquirer.prompt(questions);
  return {
    sections: answers.sections ?? ['Installation', 'Usage', 'Features', 'Contributing'],
    tone: answers.tone ?? selectedTone,
    persona: answers.persona ?? selectedPersona,
    generateNested: answers.generateNested ?? generateNested,
    templateId: answers.templateId ?? selectedTemplateId,
  };
}

async function confirmWrite(
  outputPath: string,
  outputLabel: string,
  mode: WriteMode,
  yes?: boolean,
): Promise<boolean> {
  if (!fs.existsSync(outputPath) || yes) return true;

  const message =
    mode === 'append'
      ? `${outputLabel} already exists. Append new grounded sections into it?`
      : mode === 'rewrite'
        ? `${outputLabel} already exists. Improve and rewrite it using the detected README plus code evidence?`
        : `${outputLabel} already exists. Overwrite?`;

  const { confirm } = await inquirer.prompt([
    {
      type: 'confirm',
      name: 'confirm',
      message,
      default: false,
    },
  ]);

  return confirm;
}

export async function generateCommand(options: {
  tone?: string;
  persona?: string;
  output?: string;
  yes?: boolean;
  nested?: boolean;
  files?: string[];
  template?: string;
  provider?: SemanticProvider;
  model?: string;
  hero?: string;
  context?: string;
  timeoutMs?: number;
  retries?: number;
  llmDelayMs?: number;
  maxChars?: number;
  mode?: WriteMode;
  sections?: string[];
}, command: Command) {
  if (!configManager.isConfigured()) {
    console.log(chalk.red('\nCLI is not configured. Run "readmegen init" first.\n'));
    return;
  }

  let manualFiles = options.files || [];
  if (!options.yes) {
    manualFiles = await promptForManualFiles(manualFiles);
  }

  const spinner = ora('Analyzing local codebase...').start();

  try {
    const analyzer = new LocalAnalyzerService();
    const analysis = await analyzer.analyze(manualFiles);
    spinner.succeed(`Analysis complete: ${analysis.summary.name}`);

    let selectedSections = analysis.summary.features;
    let selectedTone =
      options.tone || (configManager.get('provider') === 'groq' ? 'professional' : 'friendly');
    let selectedPersona = options.persona?.trim() || DEFAULT_PERSONA;
    let generateNested = options.nested || false;
    let selectedTemplate = findCliTemplate(options.template);
    const forceSemanticFlow =
      options.mode === 'rewrite' ||
      options.mode === 'append' ||
      Boolean(options.provider) ||
      Boolean(options.model) ||
      Boolean(options.hero) ||
      Boolean(options.context) ||
      typeof options.timeoutMs === 'number' ||
      typeof options.retries === 'number' ||
      typeof options.llmDelayMs === 'number' ||
      typeof options.maxChars === 'number';

    if (options.template && !selectedTemplate) {
      throw new Error(
        `Unknown template "${options.template}". Available IDs: ${CLI_README_TEMPLATES.map((t) => t.id).join(', ')}`,
      );
    }

    if (!README_PERSONAS.includes(selectedPersona as (typeof README_PERSONAS)[number])) {
      console.log(chalk.yellow(`\nUnknown persona "${selectedPersona}". Expected one of: ${personaHint}\n`));
    }

    const providedFlags = new Set<string>();
    if (command.getOptionValueSource('tone') === 'cli') providedFlags.add('tone');
    if (command.getOptionValueSource('persona') === 'cli') providedFlags.add('persona');
    if (command.getOptionValueSource('nested') === 'cli') providedFlags.add('nested');
    if (command.getOptionValueSource('template') === 'cli') providedFlags.add('template');
    if (command.getOptionValueSource('sections') === 'cli') providedFlags.add('sections');

    if (!options.yes) {
      const answers = await promptForReadmeOptions(
        selectedTone,
        selectedPersona,
        generateNested,
        !forceSemanticFlow,
        selectedTemplate?.id,
        providedFlags,
      );
      selectedSections = options.sections || answers.sections;
      selectedTone = answers.tone;
      selectedPersona = answers.persona;
      if (!forceSemanticFlow) {
        selectedTemplate = findCliTemplate(
          answers.templateId === 'none' ? undefined : answers.templateId,
        );
      } else {
        selectedTemplate = undefined;
      }
      generateNested = answers.generateNested;
    }

    const outputFile = options.output || 'README.md';
    const outputPath = path.join(process.cwd(), outputFile);
    const writeMode = resolveWriteMode(
      options.mode,
      Boolean(analysis.summary.existingReadme?.content?.trim()),
    );
    const configuredProvider = configManager.get('provider');
    const inferredProvider = options.provider || inferProviderFromModel(options.model);
    const usingLegacyFlow =
      Boolean(selectedTemplate) ||
      generateNested ||
      (configuredProvider === 'openai' && !inferredProvider);

    if (usingLegacyFlow && options.mode && options.mode !== 'overwrite') {
      throw new Error(
        'README write modes "rewrite" and "append" are available only on the semantic local flow. ' +
          'Remove `--template` / `--nested`, or switch away from an OpenAI-only backend config.',
      );
    }

    if (!(await confirmWrite(outputPath, outputFile, writeMode, options.yes))) {
      console.log(chalk.yellow('\nOperation cancelled. README not saved.\n'));
      return;
    }

    if (usingLegacyFlow) {
      spinner.start('Generating README via backend flow...');
      const result = await apiService.generateReadme(analysis, {
        tone: selectedTone,
        persona: selectedPersona,
        sections: selectedSections,
        shields: ['license', 'stars', 'version'],
        generateNested,
        manualImportantFiles: manualFiles,
        modelId: options.model,
        readmeTemplate: selectedTemplate ? { id: selectedTemplate.id, body: selectedTemplate.body } : undefined,
        llmDelayMs: options.llmDelayMs ?? 0,
      });
      spinner.succeed('README generated');

      fs.writeFileSync(outputPath, result.content, 'utf8');
      console.log(chalk.green(`\nWritten: ${outputPath}`));

      if (result.readmes && result.readmes.length > 0) {
        console.log(chalk.blue(`\nFound ${result.readmes.length} nested READMEs to save.`));
        for (const file of result.readmes) {
          const fullPath = path.join(process.cwd(), file.path);
          const dir = path.dirname(fullPath);
          if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
          fs.writeFileSync(fullPath, file.content, 'utf8');
          console.log(chalk.green(`  -> Written to ${file.path}`));
        }
      }

      if (selectedTemplate) {
        console.log(chalk.dim(`Template: ${selectedTemplate.name} (${selectedTemplate.id})`));
      }
      if (result.meta) {
        const tokenText =
          typeof result.meta.tokensUsed === 'number'
            ? result.meta.tokensUsed.toLocaleString()
            : 'unknown';
        const billingMode =
          result.meta.executionMode === 'byok' ? 'BYOK' : result.meta.executionMode === 'platform' ? 'platform' : 'unknown';
        console.log(chalk.dim(`Tokens: ${tokenText} · Billing: ${billingMode}`));
      }
      console.log(chalk.dim(`Persona: ${selectedPersona}`));
      console.log(chalk.dim('Flow: backend'));
      console.log();
      return;
    }

    const provider = getSemanticProvider(inferredProvider);
    const apiKey = getSemanticApiKey(provider);
    if (!apiKey) {
      throw new Error(
        `Missing API key for provider "${provider}". Set the matching env var or configure it via \`readmegen init\`.`,
      );
    }

    const model = getSemanticModel(provider, options.model);

    spinner.start(`Building README (${provider} · ${model})...`);
    const result = await runSemanticReadmePipeline(analysis, {
      llm: {
        provider,
        apiKey,
        model,
        timeoutMs: options.timeoutMs ?? 45_000,
        retries: options.retries ?? 2,
        requestDelayMs: options.llmDelayMs ?? 0,
        temperature: 0.1,
      },
      maxCharsPerChunk: options.maxChars ?? 24_000,
      additionalContext: options.context,
      heroImageUrl: options.hero,
      tone: selectedTone || 'professional',
      persona: selectedPersona,
      sections: selectedSections,
      writeMode,
    });
    spinner.succeed('README generated from semantic JSON');

    fs.writeFileSync(outputPath, result.readme, 'utf8');
    console.log(chalk.green(`\nWritten: ${outputPath}`));

    const quality = evaluateReadmeQuality(result.readme);
    console.log(chalk.blue(`\nQuality score: ${quality.score}/100`));
    for (const reason of quality.reasons.slice(0, 8)) {
      console.log(chalk.gray(`- ${reason}`));
    }

    console.log(
      chalk.gray(
        `\nEvidence chunks used: ${result.evidenceChunks.map((c) => `${c.id}~${c.approxTokens}t`).join(', ')}`,
      ),
    );
    const estimatedTokens = result.evidenceChunks.reduce((sum, chunk) => sum + chunk.approxTokens, 0);
    console.log(chalk.dim(`Tokens (estimated): ${estimatedTokens.toLocaleString()}`));
    console.log(chalk.dim(`Model: ${model} · Persona: ${selectedPersona} · Mode: ${writeMode}`));
    console.log(chalk.dim('Flow: semantic'));
    console.log();
  } catch (error: any) {
    spinner.fail(`Error: ${error.message}`);
    process.exit(1);
  }
}
