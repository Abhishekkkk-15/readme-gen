import ignore from 'ignore';

export interface FileEntry {
  path: string;
  name: string;
}

export class StructureAnalyzer {
  private static ENTRY_POINTS = ['index.ts', 'index.js', 'main.py', 'app.ts', 'app.js', 'server.ts', 'server.js', 'go.mod'];

  public static async analyze(files: string[], gitignoreContent: string): Promise<{
    entryPoints: string[];
    keyDirectories: string[];
    importantFiles: string[];
    hasDocker: boolean;
    tree: string[];
  }> {
    const ig = ignore().add(gitignoreContent || '');
    ig.add(['node_modules', '.git', '.turbo', 'dist', 'build', '.next', '.vscode']);

    const filteredFiles = files.filter(f => !ig.ignores(f));
    const entryPoints = filteredFiles.filter(f => this.ENTRY_POINTS.includes(f.split('/').pop() || ''));
    
    // Key directories detection
    const directories = new Set<string>();
    filteredFiles.forEach(f => {
      const parts = f.split('/');
      if (parts.length > 1) {
        directories.add(parts[0]);
      }
    });
    const keyDirs = Array.from(directories).filter(d => ['src', 'lib', 'app', 'tests', 'docs', 'config', 'packages', 'apps'].includes(d));

    const hasDocker = filteredFiles.some(f => f.toLowerCase().includes('dockerfile') || f.toLowerCase().includes('docker-compose'));

    // Scored files
    const scoredFiles = filteredFiles.map(f => ({
      path: f,
      score: this.calculateImportance(f, entryPoints)
    })).sort((a, b) => b.score - a.score);

    return {
      entryPoints,
      keyDirectories: keyDirs,
      importantFiles: scoredFiles.slice(0, 30).map(f => f.path),
      hasDocker,
      tree: this.generateTreeSnippet(filteredFiles, 3)
    };
  }

  private static calculateImportance(filePath: string, entryPoints: string[]): number {
    let score = 0;
    const name = filePath.split('/').pop() || '';

    if (entryPoints.includes(filePath)) score += 50;
    if (filePath.startsWith('src/') || filePath.startsWith('app/') || filePath.startsWith('apps/')) score += 20;
    if (['package.json', 'go.mod', 'requirements.txt', '.env.example', 'pyproject.toml'].includes(name)) score += 30;
    if (filePath.includes('test')) score -= 10;
    if (filePath.includes('utils')) score += 5;
    if (filePath.toLowerCase().includes('docker')) score += 15;

    return score;
  }

  private static generateTreeSnippet(files: string[], maxDepth: number): string[] {
    const tree: string[] = [];
    files.forEach(f => {
      const parts = f.split('/');
      if (parts.length <= maxDepth) {
        tree.push(f);
      }
    });
    return tree.slice(0, 100);
  }
}

