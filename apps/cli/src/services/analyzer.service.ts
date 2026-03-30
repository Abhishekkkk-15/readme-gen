import fs from 'fs';
import path from 'path';
import { glob } from 'glob';
import ignore from 'ignore';
import { 
  StructureAnalyzer, 
  PackageParser, 
  AstFeatureDetector, 
  RouteExtractor, 
  EnvExtractor, 
  DefinitionExtractor,
  TraceAnalyzer,
  SchemaAnalyzer,
  ExampleAnalyzer,
  DevOpsAnalyzer,
  ProjectAnalysis,
  ProjectSummary,
  ProjectContext
} from '@readme-gen/analyzer';

export class LocalAnalyzerService {
  private ig = ignore();

  constructor(private rootPath: string = process.cwd()) {
    this.loadGitignore();
  }

  private loadGitignore() {
    const gitignorePath = path.join(this.rootPath, '.gitignore');
    if (fs.existsSync(gitignorePath)) {
      this.ig.add(fs.readFileSync(gitignorePath, 'utf8'));
    }
    // Also ignore common non-source directories
    this.ig.add(['node_modules', '.git', 'dist', 'build', '.next', '.turbo']);
  }

  public async analyze(manualImportantFiles: string[] = []): Promise<ProjectAnalysis> {
    const allFilePaths = await this.getAllFiles();
    const fileContents: Record<string, string> = {};

    // 1. Fetch metadata files (package.json, go.mod, etc.)
    const metadataFiles = allFilePaths.filter(f => 
      f.includes('package.json') || 
      f.endsWith('go.mod') || 
      f.endsWith('requirements.txt') || 
      f.endsWith('pyproject.toml') ||
      f === '.env.example' ||
      f === 'turbo.json'
    );

    for (const file of metadataFiles) {
      console.log(`  🔍 Found metadata file: ${file}`);
      fileContents[file] = fs.readFileSync(path.join(this.rootPath, file), 'utf8');
    }

    // 2. Structure Analysis
    const structure = await StructureAnalyzer.analyze(allFilePaths, '');

    // 3. Package Metadata
    const packageMetadata = await PackageParser.parse(fileContents);

    // 4. Trace Imports (Improved with TraceAnalyzer)
    const trace = TraceAnalyzer.analyze(structure.entryPoints, fileContents);
    const importantFiles = Array.from(new Set([
      ...structure.entryPoints, 
      ...structure.importantFiles,
      ...trace.topFiles,
      ...manualImportantFiles
    ])).filter(f => fs.existsSync(path.join(this.rootPath, f))).slice(0, 70);

    console.log(`[LocalAnalyzer] Total files prioritized for analysis: ${importantFiles.length} (including ${manualImportantFiles.length} manual files)`);
    const sourceFiles = importantFiles.filter(f => f.match(/\.(ts|js|tsx|jsx)$/));
    console.log(`[LocalAnalyzer] Found ${sourceFiles.length} source files for definition extraction.`);

    const importantContents: Record<string, string> = { ...fileContents };

    for (const filePath of importantFiles) {
      if (!importantContents[filePath] && fs.existsSync(path.join(this.rootPath, filePath))) {
        importantContents[filePath] = fs.readFileSync(path.join(this.rootPath, filePath), 'utf8');
      }
    }

    // 5. Run Analyzers
    const routes = RouteExtractor.extract(importantContents);
    const envVars = EnvExtractor.extract(importantContents);
    const astFeatures = AstFeatureDetector.detect(importantContents);
    console.log(`[LocalAnalyzer] Extracting definitions using ts-morph...`);
    const definitionsMap = DefinitionExtractor.extract(importantContents);
    const extractedFileCount = Object.keys(definitionsMap).length;
    const totalSnippetCount = Object.values(definitionsMap).reduce((acc, val) => acc + val.length, 0);
    console.log(`[LocalAnalyzer] Extracted ${totalSnippetCount} definitions from ${extractedFileCount} files.`);
    const dbSchemas = SchemaAnalyzer.analyze(importantContents);
    const examples = ExampleAnalyzer.analyze(importantContents);
    const devOps = DevOpsAnalyzer.analyze(importantContents);

    // 6. Evidence collection
    const evidence = {
      files: importantFiles.map(path => ({
        path,
        snippets: definitionsMap[path] || []
      })).filter(f => f.snippets.length > 0)
    };

    // 7. Assemble Final Analysis
    const summary: ProjectSummary = {
      name: packageMetadata?.name || path.basename(this.rootPath),
      description: packageMetadata?.description || '',
      language: this.detectLanguage(allFilePaths),
      features: astFeatures.map(f => f.name),
      astFeatures,
      dbSchemas,
      examples,
      devOps,
      framework: packageMetadata?.frameworks?.[0] ? {
        name: packageMetadata.frameworks[0],
        confidence: 0.9,
        evidence: packageMetadata.frameworks
      } : undefined,
      scripts: packageMetadata?.scripts || {},
      dependencies: packageMetadata?.dependencies?.production || [],
      devDependencies: packageMetadata?.dependencies?.development || [],
      entryPoints: structure.entryPoints,
      routes: routes.map(r => ({
        method: r.method,
        path: r.path,
        file: r.file,
        snippet: r.snippet
      })),
      envVars,
      hasDocker: structure.hasDocker,
      tree: structure.tree,
      keyDirectories: structure.keyDirectories,
      isMonorepo: structure.isMonorepo
    };

    const context: ProjectContext = {
      evidence
    };

    return { summary, context };
  }

  private async getAllFiles(): Promise<string[]> {
    const files = await glob('**/*', {
      cwd: this.rootPath,
      dot: true,
      nodir: true,
      ignore: ['node_modules/**', '.git/**']
    });

    return files.filter(f => !this.ig.ignores(f));
  }

  private detectLanguage(files: string[]): string {
    const counts: Record<string, number> = {
      'TypeScript': files.filter(f => f.endsWith('.ts') || f.endsWith('.tsx')).length,
      'JavaScript': files.filter(f => f.endsWith('.js') || f.endsWith('.jsx')).length,
      'Python': files.filter(f => f.endsWith('.py')).length,
      'Go': files.filter(f => f.endsWith('.go')).length,
    };
    return Object.entries(counts).reduce((a, b) => b[1] > a[1] ? b : a)[0];
  }
}
