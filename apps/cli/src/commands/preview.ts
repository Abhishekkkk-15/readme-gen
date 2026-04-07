import ora from "ora";
import chalk from "chalk";
import { LocalAnalyzerService } from "../services/analyzer.service.js";
import { apiService } from "../services/api.service.js";
import { configManager } from "../config/config-manager.js";
import { DEFAULT_PERSONA } from "../constants/personas.js";

export async function previewCommand() {
  if (!configManager.isConfigured()) {
    console.log(
      chalk.red('\n❌ CLI is not configured. Run "readmegen init" first.\n')
    );
    return;
  }

  const spinner = ora("🔍 Scanning project...").start();

  try {
    const analyzer = new LocalAnalyzerService();
    const analysis = await analyzer.analyze();
    spinner.succeed("Project analyzed successfully!");

    spinner.start("🤖 Generating preview with AI...");
    const readme = await apiService.generateReadme(analysis, {
      tone: "professional",
      persona: DEFAULT_PERSONA,
      shields: ["license", "stars"],
    });
    spinner.succeed("Preview generated!");

    console.log(chalk.cyan("\n--- README PREVIEW ---\n"));
    console.log(readme.content);
    console.log(chalk.cyan("\n--- END OF PREVIEW ---\n"));

    console.log(
      chalk.yellow('💡 Run "readmegen generate" to save this to README.md.\n')
    );
  } catch (error: any) {
    spinner.fail(`Error: ${error.message}`);
    process.exit(1);
  }
}
