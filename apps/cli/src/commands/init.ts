import inquirer from 'inquirer';
import chalk from 'chalk';
import { configManager, type CliProvider } from '../config/config-manager.js';
import { GEMINI_MODELS, GROQ_MODELS, OPENAI_MODELS } from '../constants/models.js';

type InitAnswers = {
  provider: CliProvider;
  apiKey: string;
  model: string;
};

export async function initCommand() {
  console.log(chalk.cyan('\n🚀 Welcome to README Gen CLI Setup!\n'));

  const answers = (await inquirer.prompt([
    {
      type: 'list',
      name: 'provider',
      message: 'Select an AI provider:',
      choices: ['groq', 'openai', 'gemini'],
      default: configManager.get('provider'),
    },
    {
      type: 'input',
      name: 'apiKey',
      message: (ans: { provider: string }) => {
        if (ans.provider === 'gemini') return 'Enter your Google AI (Gemini) API key:';
        return `Enter your ${ans.provider.toUpperCase()} API Key:`;
      },
      validate: (input: string) => (input.length > 0 ? true : 'API Key is required.'),
    },
    {
      type: 'list',
      name: 'model',
      message: 'Select a default model:',
      choices: (ans: { provider: string }) => {
        if (ans.provider === 'groq') return [...GROQ_MODELS];
        if (ans.provider === 'gemini') return [...GEMINI_MODELS];
        return [...OPENAI_MODELS];
      },
      default: configManager.get('model'),
    },
  ])) as InitAnswers;

  configManager.set('provider', answers.provider);
  configManager.set('model', answers.model);

  if (answers.provider === 'groq') {
    configManager.set('groqKey', answers.apiKey);
  } else if (answers.provider === 'openai') {
    configManager.set('openaiKey', answers.apiKey);
  } else {
    configManager.set('geminiKey', answers.apiKey);
  }

  console.log(chalk.green('\n✅ Configuration complete! You can now run "readmegen generate" or "readmegen generate-readme".\n'));
}
