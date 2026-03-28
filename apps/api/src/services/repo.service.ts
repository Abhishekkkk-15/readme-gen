import axios from 'axios';
import { PackageExtractor } from '../extractors/package.extractor';
import { ApiExtractor } from '../extractors/api.extractor';
import { ConfigExtractor } from '../extractors/config.extractor';
import { StructureAnalyzer } from '../analyzers/structure.analyzer';
import { DependencyAnalyzer } from '../analyzers/dependency.analyzer';
import { CodeSampler } from '../samplers/code.sampler';
import { ContextFormatter } from '../prompt/context.formatter';

export class RepoService {
  private GITHUB_API_URL = 'https://api.github.com/repos';

  public async analyzeRepo(repoUrl: string): Promise<any> {
    try {
      const { owner, repo } = this.parseRepoUrl(repoUrl);
      const repoInfo = await this.getRepoInfo(owner, repo);
      const allFilePaths = await this.getFileStructure(owner, repo);
      
      // 1. Fetch contents of key metadata files
      const metadataFiles = ['package.json', 'go.mod', 'requirements.txt', 'pyproject.toml', '.env.example', '.env', '.gitignore'];
      const fileContents: Record<string, string> = {};
      
      for (const file of metadataFiles) {
        if (allFilePaths.includes(file)) {
          fileContents[file] = await this.getFileContent(owner, repo, file);
        }
      }

      // 2. Comprehensive Structure Analysis
      const structure = await StructureAnalyzer.analyze(allFilePaths, fileContents['.gitignore'] || '');
      
      // 3. Package Metadata Extraction
      const packageMetadata = await PackageExtractor.extract(fileContents);
      
      // 4. Dependency Analysis
      const techStack = DependencyAnalyzer.analyze([
        ...(packageMetadata?.dependencies.production || []),
        ...(packageMetadata?.dependencies.development || [])
      ]);

      // 5. Configuration Extraction
      const configuration = ConfigExtractor.extract(fileContents);

      // 6. API and Code Sampling
      const endpoints: any[] = [];
      const codeSamples: any[] = [];
      
      // Process important files (limit to top 15 for performance/payload)
      const filesToAnalyze = structure.importantFiles.slice(0, 15);
      for (const filePath of filesToAnalyze) {
        try {
          const content = await this.getFileContent(owner, repo, filePath);
          
          // Extract API endpoints
          const fileEndpoints = ApiExtractor.extract(content, filePath);
          endpoints.push(...fileEndpoints);

          // Sample code
          const sample = CodeSampler.sample(content, filePath);
          codeSamples.push(sample);
        } catch (err) {
          console.warn(`Failed to process ${filePath}:`, err);
        }
      }

      // 7. Format for LLM
      const rawExtractedData = {
        packageMetadata,
        structure,
        techStack,
        api: { endpoints, totalCount: endpoints.length },
        configuration,
        codeSamples
      };

      return ContextFormatter.formatForLLM(rawExtractedData);
    } catch (error: any) {
      console.error('Error analyzing repo:', error);
      throw new Error(`Failed to analyze repository: ${error.message}`);
    }
  }

  private parseRepoUrl(url: string): { owner: string; repo: string } {
    const parts = url.replace('https://github.com/', '').split('/');
    if (parts.length < 2) {
      throw new Error('Invalid GitHub URL');
    }
    return { owner: parts[0], repo: parts[1] };
  }

  private async getRepoInfo(owner: string, repo: string) {
    const response = await axios.get(`${this.GITHUB_API_URL}/${owner}/${repo}`);
    return response.data;
  }

  private async getFileStructure(owner: string, repo: string): Promise<string[]> {
    const repoData = await this.getRepoInfo(owner, repo);
    const defaultBranch = repoData.default_branch || 'main';
    const response = await axios.get(
      `${this.GITHUB_API_URL}/${owner}/${repo}/git/trees/${defaultBranch}?recursive=1`
    );
    return response.data.tree
      .filter((item: any) => item.type === 'blob')
      .map((item: any) => item.path);
  }

  private async getFileContent(owner: string, repo: string, path: string): Promise<string> {
    const response = await axios.get(
      `${this.GITHUB_API_URL}/${owner}/${repo}/contents/${path}`,
      { headers: { Accept: 'application/vnd.github.v3.raw' } }
    );
    return response.data;
  }
}

export const repoService = new RepoService();
