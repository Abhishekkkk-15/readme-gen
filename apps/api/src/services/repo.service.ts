import axios from 'axios';
import {
  StructureAnalyzer,
  DependencyAnalyzer,
  RouteExtractor,
  EnvExtractor,
  PackageParser,
  AstFeatureDetector,
  ProjectAnalysis
} from '@readme-gen/analyzer';
import { config } from 'dotenv';
config();
export class RepoService {
  private GITHUB_API_URL = 'https://api.github.com/repos';

  public async analyzeRepo(repoUrl: string): Promise<ProjectAnalysis> {
    try {
      const { owner, repo } = this.parseRepoUrl(repoUrl);
      const allFilePaths = await this.getFileStructure(owner, repo);

      // 1. Fetch metadata files
      const metadataFiles = ['package.json', 'go.mod', 'requirements.txt', 'pyproject.toml', '.env.example', '.env', '.gitignore'];
      const fileContents: Record<string, string> = {};

      for (const file of metadataFiles) {
        if (allFilePaths.includes(file)) {
          fileContents[file] = await this.getFileContent(owner, repo, file);
        }
      }

      // 2. Structure Analysis
      const structure = await StructureAnalyzer.analyze(allFilePaths, fileContents['.gitignore'] || '');

      // 3. Package Metadata
      const packageMetadata = await PackageParser.parse(fileContents);

      // 4. Fetch content for important files (limit to 15 for AST/Evidence)
      const importantFiles = structure.importantFiles.slice(0, 15);
      const importantContents: Record<string, string> = { ...fileContents };

      for (const filePath of importantFiles) {
        if (!importantContents[filePath]) {
          try {
            importantContents[filePath] = await this.getFileContent(owner, repo, filePath);
          } catch (err) {
            console.warn(`Failed to fetch ${filePath}:`, err);
          }
        }
      }

      // 5. AST-based analysis
      const routes = RouteExtractor.extract(importantContents);
      const envVars = EnvExtractor.extract(importantContents);
      const astFeatures = AstFeatureDetector.detect(importantContents);

      // 6. Evidence collection
      const evidence = {
        files: importantFiles.map(path => ({
          path,
          snippets: this.extractSnippets(importantContents[path], path)
        })).filter(f => f.snippets.length > 0)
      };

      // 7. Assemble Final Analysis
      const analysis: ProjectAnalysis = {
        name: packageMetadata?.name || repo,
        description: packageMetadata?.description || '',
        language: this.detectLanguage(allFilePaths),
        features: astFeatures.map(f => f.name),
        astFeatures,
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
        evidence
      };

      return analysis;
    } catch (error: any) {
      console.error('Error analyzing repo:', error);
      throw new Error(`Failed to analyze repository: ${error.message}`);
    }
  }



  private extractSnippets(content: string, filePath: string): string[] {
    if (!content) return [];
    // Just a simple snippet extractor for now, targeting exports or starts of files
    const lines = content.split('\n');
    const snippets: string[] = [];

    // Grab first 5 lines
    if (lines.length > 0) snippets.push(lines.slice(0, 5).join('\n'));

    // Grab any line with "export" or route definition
    const interestingLines = lines.filter(l =>
      l.includes('export ') ||
      l.includes('async function') ||
      l.includes('class ') ||
      l.includes('.get(') ||
      l.includes('.post(')
    ).slice(0, 3);

    snippets.push(...interestingLines);

    return Array.from(new Set(snippets));
  }

  private detectLanguage(files: string[]): string {
    const counts: Record<string, number> = {
      'TypeScript': files.filter(f => f.endsWith('.ts')).length,
      'JavaScript': files.filter(f => f.endsWith('.js')).length,
      'Python': files.filter(f => f.endsWith('.py')).length,
      'Go': files.filter(f => f.endsWith('.go')).length,
    };
    return Object.entries(counts).reduce((a, b) => b[1] > a[1] ? b : a)[0];
  }

  private parseRepoUrl(url: string): { owner: string; repo: string } {
    const parts = url.replace('https://github.com/', '').split('/');
    if (parts.length < 2) {
      throw new Error('Invalid GitHub URL');
    }
    return { owner: parts[0], repo: parts[1] };
  }

  private async getRepoInfo(owner: string, repo: string) {
    const response = await axios.get(`${this.GITHUB_API_URL}/${owner}/${repo}`,
      {
        headers: {
          Authorization: `Bearer ${process.env.GITHUB_TOKEN}`,
        },
      }
    );
    console.log(response.data)
    return response.data;
  }

  private async getFileStructure(owner: string, repo: string): Promise<string[]> {
    const repoData = await this.getRepoInfo(owner, repo);
    const defaultBranch = repoData.default_branch || 'main';
    const response = await axios.get(
      `${this.GITHUB_API_URL}/${owner}/${repo}/git/trees/${defaultBranch}?recursive=1`,
      {
        headers: {
          Authorization: `Bearer ${process.env.GITHUB_TOKEN}`,
        },
      }
    );
    return response.data.tree
      .filter((item: any) => item.type === 'blob')
      .map((item: any) => item.path);
  }

  private async getFileContent(owner: string, repo: string, path: string): Promise<string> {
    const response = await axios.get(
      `${this.GITHUB_API_URL}/${owner}/${repo}/contents/${path}`,
      {
        headers: {
          Accept: 'application/vnd.github.v3.raw',
          Authorization: `Bearer ${process.env.GITHUB_TOKEN}`,
        }
      }
    );
    return typeof response.data === 'object'
      ? JSON.stringify(response.data)
      : String(response.data);
  }
}

export const repoService = new RepoService();

