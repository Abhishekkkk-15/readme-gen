import inquirer from 'inquirer';
import chalk from 'chalk';
import { configManager } from '../config/config-manager.js';

export async function initCommand() {
  console.log(chalk.cyan('\n🚀 Welcome to README Gen CLI Setup!\n'));

  const answers = await inquirer.prompt([
    {
      type: 'list',
      name: 'provider',
      message: 'Select an AI provider:',
      choices: ['groq', 'openai'],
      default: configManager.get('provider')
    },
    {
      type: 'input',
      name: 'apiKey',
      message: (ans) => `Enter your ${ans.provider.toUpperCase()} API Key:`,
      validate: (input) => input.length > 0 ? true : 'API Key is required.'
    },
    {
      type: 'list',
      name: 'model',
      message: 'Select a default model:',
      choices: (ans) => ans.provider === 'groq' 
        ? ['llama-3.1-8b-instant', 'llama-3.1-70b-versatile'] 
        : ['gpt-4o', 'gpt-4o-mini'],
      default: configManager.get('model')
    }
  ]);

  configManager.set('provider', answers.provider);
  configManager.set('model', answers.model);
  
  if (answers.provider === 'groq') {
    configManager.set('groqKey', answers.apiKey);
  } else {
    configManager.set('openaiKey', answers.apiKey);
  }

  console.log(chalk.green('\n✅ Configuration complete! You can now run "readmegen generate".\n'));
}
