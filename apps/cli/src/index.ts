#!/usr/bin/env node

import { Command } from 'commander';
import { initCommand } from './commands/init.js';
import { generateCommand } from './commands/generate.js';
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
  .action(generateCommand);

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
