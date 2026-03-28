import axios from 'axios';

interface RepoMetadata {
  projectName: string;
  description: string;
  structure: string[];
  functions: string[];
  variables: string[];
}

class RepoService {
  private GITHUB_API_URL = 'https://api.github.com/repos';

  /**
   * Analyzes a GitHub repository and extracts project metadata.
   * @param repoUrl The full URL of the GitHub repository.
   */
  public async analyzeRepo(repoUrl: string): Promise<RepoMetadata> {
    try {
      const { owner, repo } = this.parseRepoUrl(repoUrl);
      
      // 1. Fetch Repository Info (Name and Description)
      const repoInfo = await this.getRepoInfo(owner, repo);
      
      // 2. Fetch File Structure (Recursive Tree)
      const structure = await this.getFileStructure(owner, repo);
      
      // 3. Extract Key Content (Functions, Variables) from important files
      const { functions, variables } = await this.extractCodeMetadata(owner, repo, structure);

      return {
        projectName: repoInfo.name,
        description: repoInfo.description || '',
        structure: structure.slice(0, 100), // Limit to top 100 files for context
        functions,
        variables,
      };
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
    try {
      // Get the default branch first
      const repoData = await this.getRepoInfo(owner, repo);
      const defaultBranch = repoData.default_branch || 'main';
      
      const response = await axios.get(
        `${this.GITHUB_API_URL}/${owner}/${repo}/git/trees/${defaultBranch}?recursive=1`
      );
      
      return response.data.tree
        .filter((item: any) => item.type === 'blob')
        .map((item: any) => item.path)
        .filter((path: string) => !path.includes('node_modules') && !path.startsWith('.git/'));
    } catch (error) {
      console.warn('Could not fetch recursive tree, falling back to basic contents');
      const response = await axios.get(`${this.GITHUB_API_URL}/${owner}/${repo}/contents`);
      return response.data.map((item: any) => item.path);
    }
  }

  private async extractCodeMetadata(owner: string, repo: string, structure: string[]) {
    const importantFiles = structure.filter(path => 
      (path.includes('src/') || path.includes('lib/') || path.includes('app/')) &&
      (path.endsWith('.ts') || path.endsWith('.js') || path.endsWith('.py') || path.endsWith('.go'))
    ).slice(0, 5); // Limit to top 5 files to avoid hitting rate limits or large payloads

    const functions: string[] = [];
    const variables: string[] = [];

    for (const filePath of importantFiles) {
      try {
        const content = await this.getFileContent(owner, repo, filePath);
        const { foundFunctions, foundVariables } = this.parseContent(content, filePath);
        functions.push(...foundFunctions.map(f => `${filePath}: ${f}`));
        variables.push(...foundVariables.map(v => `${filePath}: ${v}`));
      } catch (err) {
        console.error(`Failed to parse ${filePath}:`, err);
      }
    }

    return { 
      functions: functions.slice(0, 20), 
      variables: variables.slice(0, 20) 
    };
  }

  private async getFileContent(owner: string, repo: string, path: string): Promise<string> {
    const response = await axios.get(
      `${this.GITHUB_API_URL}/${owner}/${repo}/contents/${path}`,
      { headers: { Accept: 'application/vnd.github.v3.raw' } }
    );
    return response.data;
  }

  private parseContent(content: string, filePath: string) {
    const foundFunctions: string[] = [];
    const foundVariables: string[] = [];

    // Simple regex for JS/TS/PY functions
    if (filePath.endsWith('.ts') || filePath.endsWith('.js')) {
      const funcRegex = /export\s+(?:async\s+)?(?:function|const)\s+([a-zA-Z0-9_]+)\s*(?:=|\[|\()/g;
      let match;
      while ((match = funcRegex.exec(content)) !== null) {
        if (match[1]) foundFunctions.push(match[1]);
      }
      
      const varRegex = /export\s+(?:const|let|var)\s+([a-zA-Z0-9_]+)\s*=/g;
      while ((match = varRegex.exec(content)) !== null) {
        if (match[1]) foundVariables.push(match[1]);
      }
    } else if (filePath.endsWith('.py')) {
      const funcRegex = /def\s+([a-zA-Z0-9_]+)\s*\(/g;
      let match;
      while ((match = funcRegex.exec(content)) !== null) {
        if (match[1]) foundFunctions.push(match[1]);
      }
    }

    return { foundFunctions, foundVariables };
  }
}

export const repoService = new RepoService();
