import chalk from 'chalk';
import { configManager, type CliProvider } from '../../config/config-manager.js';

export function configViewCommand() {
  const config = configManager.getAll();
  console.log(chalk.cyan('\n⚙️ Current Configuration:\n'));
  console.log(`Provider: ${chalk.bold(config.provider)}`);
  console.log(`Model:    ${chalk.bold(config.model)}`);
  console.log(`API URL:  ${chalk.bold(config.apiUrl)}`);

  if (config.groqKey) {
    console.log(`Groq Key: ${chalk.dim('********' + config.groqKey.slice(-4))}`);
  }
  if (config.openaiKey) {
    console.log(`OpenAI Key: ${chalk.dim('********' + config.openaiKey.slice(-4))}`);
  }
  if (config.geminiKey) {
    console.log(`Gemini Key: ${chalk.dim('********' + config.geminiKey.slice(-4))}`);
  }
  console.log('');
}

export function configSetKeyCommand(key: string, options: { provider?: CliProvider }) {
  const raw = options.provider || configManager.get('provider');
  if (raw === 'groq') {
    configManager.set('groqKey', key);
  } else if (raw === 'gemini') {
    configManager.set('geminiKey', key);
  } else {
    configManager.set('openaiKey', key);
  }
  console.log(chalk.green(`\n✅ API Key updated for ${raw.toUpperCase()}.\n`));
}

export function configSetModelCommand(model: string) {
  configManager.set('model', model);
  console.log(chalk.green(`\n✅ Default model set to ${model}.\n`));
}

export function configResetCommand() {
  configManager.reset();
  console.log(chalk.yellow('\n✅ Configuration has been reset.\n'));
}
