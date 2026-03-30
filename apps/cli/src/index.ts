#!/usr/bin/env node

import { Command } from 'commander';
import { initCommand } from './commands/init.js';
import { generateCommand } from './commands/generate.js';
import { generateReadmeSemanticCommand } from './commands/generate-readme.js';
import { previewCommand } from './commands/preview.js';
import { 
  configViewCommand, 
  configSetKeyCommand, 
  configSetModelCommand, 
  configResetCommand 
} from './commands/config/index.js';

const program = new Command();

program
  .name('readmegen')
  .description('Enterprise-grade AI README generator for your local projects')
  .version('1.0.0');

program
  .command('init')
  .description('Initialize configuration with API keys')
  .action(initCommand);

program
  .command('generate')
  .description('Analyze the current project and generate a README.md')
  .option('-t, --tone <tone>', 'Set the README tone (professional, friendly, minimal, enterprise)')
  .option('-o, --output <file>', 'Output filename', 'README.md')
  .option('-y, --yes', 'Automatically answer yes to prompt (non-interactive)')
  .option('-n, --nested', 'Generate nested READMEs for sub-directories (Monorepos)')
  .option('-f, --files <paths...>', 'Manually specify important files for deeper analysis')
  .action(generateCommand);

program
  .command('generate-readme')
  .description('Generate a production-grade README via the semantic JSON pipeline (no raw-code README generation)')
  .option('-p, --provider <provider>', 'LLM provider (groq, gemini)', 'groq')
  .option('-o, --output <file>', 'Output filename', 'README.md')
  .option('-t, --tone <tone>', 'Tone (professional, friendly, minimal, enterprise)', 'professional')
  .option('--hero <url>', 'Hero screenshot/banner image URL')
  .option('--context <text>', 'Extra business context ("why it exists")')
  .option('--timeout-ms <ms>', 'LLM timeout in ms', (v) => Number(v), 45000)
  .option('--retries <n>', 'Retry count for transient LLM errors', (v) => Number(v), 2)
  .option('--max-chars <n>', 'Max chars per evidence chunk (~24k ≈ 6k tokens)', (v) => Number(v), 24000)
  .option('-f, --files <paths...>', 'Manually specify important files for deeper analysis')
  .action(generateReadmeSemanticCommand);

program
  .command('preview')
  .description('Preview the generated README in the terminal')
  .action(previewCommand);

const config = program.command('config').description('Manage CLI configuration');

config
  .command('view')
  .description('View current configuration')
  .action(configViewCommand);

config
  .command('set-key <key>')
  .description('Set API key for the current or specified provider')
  .option('-p, --provider <provider>', 'Provider to set key for (groq, openai)')
  .action(configSetKeyCommand);

config
  .command('set-model <model>')
  .description('Set the default AI model')
  .action(configSetModelCommand);

config
  .command('reset')
  .description('Clear all saved configuration')
  .action(configResetCommand);

program.parse(process.argv);
