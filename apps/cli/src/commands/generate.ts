import ora from 'ora';
import chalk from 'chalk';
import fs from 'fs';
import path from 'path';
import inquirer from 'inquirer';
import { LocalAnalyzerService } from '../services/analyzer.service.js';
import { apiService } from '../services/api.service.js';
import { configManager } from '../config/config-manager.js';

export async function generateCommand(options: { tone?: string; output?: string; yes?: boolean; nested?: boolean; files?: string[] }) {
  if (!configManager.isConfigured()) {
    console.log(chalk.red('\n❌ CLI is not configured. Run "readmegen init" first.\n'));
    return;
  }

  let manualFiles = options.files || [];
  
  if (!options.yes && manualFiles.length === 0) {
    const { addFiles } = await inquirer.prompt([{
      type: 'confirm',
      name: 'addFiles',
      message: 'Would you like to manually specify important files for deeper analysis?',
      default: false
    }]);

    if (addFiles) {
      const { filesInput } = await inquirer.prompt([{
        type: 'input',
        name: 'filesInput',
        message: 'Enter file paths (comma-separated):',
        validate: (input) => input.trim().length > 0
      }]);
      manualFiles = filesInput.split(',').map((f: string) => f.trim()).filter(Boolean);
    }
  }

  const spinner = ora('🔍 Scanning project...').start();
  
  try {
    // 1. Local Analysis (Passing manual important files)
    const analyzer = new LocalAnalyzerService();
    const analysis = await analyzer.analyze(manualFiles);
    spinner.succeed('Project analyzed successfully!');

    // 2. Interaction
    let selectedSections = analysis.summary.features;
    let selectedTone = options.tone || (configManager.get('provider') === 'groq' ? 'professional' : 'friendly');
    let generateNested = options.nested || false;
    
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
          choices: ['professional', 'friendly', 'minimal', 'enterprise', 'humorous', 'academic', 'concise', 'storytelling'],
          default: selectedTone
        },
        {
          type: 'confirm',
          name: 'generateNested',
          message: 'Generate nested READMEs for sub-directories (Monorepos)?',
          default: generateNested
        }
      ]);
      selectedSections = answers.sections;
      selectedTone = answers.tone;
      generateNested = answers.generateNested;
    }

    // 3. API Call
    spinner.start('🤖 Generating README with AI...');
    const result = await apiService.generateReadme(analysis, {
      tone: selectedTone,
      sections: selectedSections,
      shields: ['license', 'stars', 'version'],
      generateNested,
      manualImportantFiles: manualFiles
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

    fs.writeFileSync(outputPath, result.content);
    console.log(chalk.green(`\n✨ Successfully written to ${outputPath}!`));

    // Handle nested files
    if (result.readmes && result.readmes.length > 0) {
      console.log(chalk.blue(`\n📂 Found ${result.readmes.length} nested READMEs to save.`));
      for (const file of result.readmes) {
        const fullPath = path.join(process.cwd(), file.path);
        const dir = path.dirname(fullPath);
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
        
        // Write the nested file!
        fs.writeFileSync(fullPath, file.content);
        console.log(chalk.green(`  -> Written to ${file.path}`));
      }
    }
    console.log();

  } catch (error: any) {
    spinner.fail(`Error: ${error.message}`);
    process.exit(1);
  }
}
