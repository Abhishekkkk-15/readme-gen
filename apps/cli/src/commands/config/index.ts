import chalk from 'chalk';
import { configManager } from '../../config/config-manager.js';

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
  console.log('');
}

export function configSetKeyCommand(key: string, options: { provider?: string }) {
  const provider = options.provider || configManager.get('provider');
  if (provider === 'groq') {
    configManager.set('groqKey', key);
  } else {
    configManager.set('openaiKey', key);
  }
  console.log(chalk.green(`\n✅ API Key updated for ${provider.toUpperCase()}.\n`));
}

export function configSetModelCommand(model: string) {
  configManager.set('model', model);
  console.log(chalk.green(`\n✅ Default model set to ${model}.\n`));
}

export function configResetCommand() {
  configManager.reset();
  console.log(chalk.yellow('\n✅ Configuration has been reset.\n'));
}
