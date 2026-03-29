import ora from 'ora';
import chalk from 'chalk';
import fs from 'fs';
import path from 'path';
import inquirer from 'inquirer';
import { LocalAnalyzerService } from '../services/analyzer.service.js';
import { apiService } from '../services/api.service.js';
import { configManager } from '../config/config-manager.js';

export async function generateCommand(options: { tone?: string; output?: string; yes?: boolean }) {
  if (!configManager.isConfigured()) {
    console.log(chalk.red('\n❌ CLI is not configured. Run "readmegen init" first.\n'));
    return;
  }

  const spinner = ora('🔍 Scanning project...').start();
  
  try {
    // 1. Local Analysis
    const analyzer = new LocalAnalyzerService();
    const analysis = await analyzer.analyze();
    spinner.succeed('Project analyzed successfully!');

    // 2. Interaction (Optional: confirm sections/tone if not --yes)
    let selectedSections = analysis.features;
    let selectedTone = options.tone || configManager.get('provider') === 'groq' ? 'professional' : 'friendly';
    
    if (!options.yes) {
      const answers = await inquirer.prompt([
        {
          type: 'checkbox',
          name: 'sections',
          message: 'Select sections to include:',
          choices: [
            'Installation', 'Usage', 'API Reference', 'Deployment', 
            'Architecture', 'Environment Variables', 'Contributing', 'License'
          ],
          default: ['Installation', 'Usage', 'Features', 'Contributing']
        },
        {
          type: 'list',
          name: 'tone',
          message: 'Select README tone:',
          choices: ['professional', 'friendly', 'minimal', 'enterprise'],
          default: selectedTone
        }
      ]);
      selectedSections = answers.sections;
      selectedTone = answers.tone;
    }

    // 3. API Call
    spinner.start('🤖 Generating README with AI...');
    const readme = await apiService.generateReadme(analysis, {
      tone: selectedTone,
      sections: selectedSections,
      shields: ['license', 'stars', 'version']
    });
    spinner.succeed('README generated!');

    // 4. Save to File
    const outputPath = path.join(process.cwd(), options.output || 'README.md');
    
    if (fs.existsSync(outputPath) && !options.yes) {
      const { confirm } = await inquirer.prompt([{
        type: 'confirm',
        name: 'confirm',
        message: `${options.output || 'README.md'} already exists. Overwrite?`,
        default: false
      }]);
      if (!confirm) {
        console.log(chalk.yellow('\n⚠️ Operation cancelled. README not saved.\n'));
        return;
      }
    }

    fs.writeFileSync(outputPath, readme);
    console.log(chalk.green(`\n✨ Successfully written to ${outputPath}!\n`));

  } catch (error: any) {
    spinner.fail(`Error: ${error.message}`);
    process.exit(1);
  }
}
