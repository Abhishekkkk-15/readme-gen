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
    isMonorepo: boolean;
    tree: string[];
  }> {
    const ig = ignore().add(gitignoreContent || '');
    ig.add(['node_modules', '.git', '.turbo', 'dist', 'build', '.next', '.vscode']);

    const normalizedFiles = files.map(f => f.replace(/\\/g, '/'));
    const filteredFiles = normalizedFiles.filter(f => !ig.ignores(f));
    const entryPoints = filteredFiles.filter(f => this.ENTRY_POINTS.includes(f.split('/').pop() || ''));
    
    // Key directories detection
    const directories = new Set<string>();
    const keyPatterns = ['src', 'lib', 'app', 'tests', 'docs', 'config', 'packages', 'apps', 'controllers', 'routes', 'services'];
    
    filteredFiles.forEach(f => {
      const parts = f.split('/');
      parts.forEach(part => {
        if (keyPatterns.includes(part.toLowerCase())) {
          directories.add(part);
        }
      });
    });
    const keyDirs = Array.from(directories);

    const hasDocker = filteredFiles.some(f => f.toLowerCase().includes('dockerfile') || f.toLowerCase().includes('docker-compose'));

    // Monorepo detection
    const isMonorepo = filteredFiles.some(f => 
      f === 'pnpm-workspace.yaml' || 
      f === 'lerna.json' || 
      f === 'turbo.json' ||
      (f.endsWith('package.json') && filteredFiles.some(file => file.startsWith('packages/') || file.startsWith('apps/')))
    );

    // Scored files
    const scoredFiles = filteredFiles.map(f => ({
      path: f,
      score: this.calculateImportance(f, entryPoints)
    })).sort((a, b) => b.score - a.score);

    return {
      entryPoints,
      keyDirectories: keyDirs,
      importantFiles: scoredFiles.slice(0, 40).map(f => f.path),
      hasDocker,
      isMonorepo,
      tree: this.generateTreeSnippet(filteredFiles, 5) // Increased depth to 5
    };
  }

  private static calculateImportance(filePath: string, entryPoints: string[]): number {
    let score = 0;
    const name = filePath.split('/').pop() || '';
    const lowerPath = filePath.toLowerCase();

    if (entryPoints.includes(filePath)) score += 100; // Entry points are critical
    
    // Core architecture folders
    if (lowerPath.includes('controller')) score += 60;
    if (lowerPath.includes('route')) score += 60;
    if (lowerPath.includes('api/')) score += 50; 
    if (lowerPath.includes('service')) score += 40;
    
    // Monorepo specific deep scoring
    if (lowerPath.includes('apps/') && (lowerPath.includes('/src/') || lowerPath.includes('/app/') || lowerPath.includes('/pages/'))) score += 30;
    if (lowerPath.includes('packages/') && lowerPath.includes('/src/')) score += 20;

    // File-based Route Detection (Next.js / Nuxt)
    if (lowerPath.includes('pages/api/') || lowerPath.includes('app/api/')) score += 60;

    // Infrastructure
    if (['package.json', 'go.mod', 'requirements.txt', '.env.example', 'pyproject.toml', 'turbo.json'].includes(name)) score += 60;
    if (lowerPath.includes('docker')) score += 20;
    
    // Negative weights
    if (lowerPath.includes('test')) score -= 40;
    if (lowerPath.includes('spec')) score -= 40;
    if (lowerPath.includes('mock')) score -= 50;
    if (lowerPath.includes('util')) score += 5; // Utils are okay but less critical than controllers

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
    return tree.slice(0, 500); // Increased count to 500
  }
}

