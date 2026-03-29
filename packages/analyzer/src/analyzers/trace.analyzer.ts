import { Project, SyntaxKind } from 'ts-morph';
import path from 'path';

export class TraceAnalyzer {
  public static analyze(entryPoints: string[], files: Record<string, string>) {
    const project = new Project({ useInMemoryFileSystem: true });
    const graph: Map<string, string[]> = new Map();
    const scores: Map<string, number> = new Map();

    // Populate project and scores
    for (const [filePath, content] of Object.entries(files)) {
      if (filePath.match(/\.(ts|js|tsx|jsx)$/)) {
        project.createSourceFile(filePath, content);
        scores.set(filePath, 0);
      }
    }

    const visited = new Set<string>();
    const stack = [...entryPoints];

    while (stack.length > 0) {
      const current = stack.pop()!;
      if (visited.has(current)) continue;
      visited.add(current);

      const sourceFile = project.getSourceFile(current);
      if (!sourceFile) continue;

      const imports = sourceFile.getImportDeclarations();
      const currentDeps: string[] = [];

      imports.forEach(imp => {
        const moduleSpecifier = imp.getModuleSpecifierValue();
        if (moduleSpecifier.startsWith('.')) {
          // Resolve relative path
          const dir = path.dirname(current);
          const resolved = this.resolvePath(dir, moduleSpecifier, Object.keys(files));
          if (resolved) {
            currentDeps.push(resolved);
            scores.set(resolved, (scores.get(resolved) || 0) + 1);
            stack.push(resolved);
          }
        }
      });
      graph.set(current, currentDeps);
    }

    // Top 10 most imported files
    const topFiles = Array.from(scores.entries())
      .sort((a, b) => b[1] - a[1])
      .filter(f => f[1] > 0)
      .slice(0, 10)
      .map(f => f[0]);

    return {
      topFiles,
      entryPoints,
      graph: Object.fromEntries(graph)
    };
  }

  private static resolvePath(dir: string, specifier: string, allFiles: string[]): string | null {
    const fullPath = path.posix.join(dir, specifier);
    const extensions = ['', '.ts', '.js', '.tsx', '.jsx', '/index.ts', '/index.js'];
    
    for (const ext of extensions) {
      const candidate = `${fullPath}${ext}`;
      if (allFiles.includes(candidate)) return candidate;
      // Also check with leading slash if needed
      const absoluteCandidate = candidate.startsWith('/') ? candidate : `/${candidate}`;
      if (allFiles.includes(absoluteCandidate)) return absoluteCandidate;
    }
    return null;
  }
}
