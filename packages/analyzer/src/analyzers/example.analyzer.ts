import { Project, SyntaxKind, CallExpression } from 'ts-morph';

export class ExampleAnalyzer {
  public static analyze(files: Record<string, string>) {
    const examples: any[] = [];
    const project = new Project({ useInMemoryFileSystem: true });

    for (const [filePath, content] of Object.entries(files)) {
      if (filePath.endsWith('.py') && this.isPythonTestPath(filePath)) {
        this.collectPythonTests(filePath, content, examples);
        continue;
      }
      if (filePath.endsWith('_test.go')) {
        this.collectGoTests(filePath, content, examples);
        continue;
      }
      if (!filePath.match(/\.(test|spec)\.(ts|js|jsx|tsx)$/) && !filePath.includes('__tests__')) continue;
      
      const sourceFile = project.createSourceFile(filePath, content);
      const callExpressions = sourceFile.getDescendantsOfKind(SyntaxKind.CallExpression);

      for (const call of callExpressions) {
        const name = call.getExpression().getText().toLowerCase();
        if (['it', 'test'].includes(name)) {
          const args = call.getArguments();
          if (args.length >= 2) {
            const description = args[0].getText().replace(/['"`]/g, '');
            const body = args[1].getText();
            
            // Heuristic for "Good" examples: contain multiple calls or interesting snippets
            const isInteresting = body.includes('await') || body.includes('expect') || body.split('\n').length > 5;
            
            if (isInteresting && examples.length < 15) {
              const cleanBody = body.replace(/^\(\) => \{|\}$|^\(async \(\) => \{|\}$/g, '').trim();
              examples.push({
                description,
                code: cleanBody,
                file: filePath
              });
            }
          }
        }
      }
    }

    return examples.length > 0 ? examples : undefined;
  }

  private static isPythonTestPath(filePath: string): boolean {
    const base = filePath.split('/').pop() || '';
    if (base.startsWith('test_') && base.endsWith('.py')) return true;
    if (filePath.includes('/tests/') || filePath.includes('/test/')) return true;
    return false;
  }

  private static collectPythonTests(
    filePath: string,
    content: string,
    examples: any[],
  ) {
    const re = /^(async\s+)?def\s+(test_\w+)\s*\([^)]*\):/gm;
    let m: RegExpExecArray | null;
    while ((m = re.exec(content)) !== null) {
      if (examples.length >= 15) break;
      const start = m.index;
      const next = content.indexOf('\ndef ', start + 5);
      const block = content.slice(
        start,
        next === -1 ? Math.min(start + 800, content.length) : Math.min(next, start + 800),
      );
      examples.push({
        description: m[2]!,
        code: block.trim(),
        file: filePath,
      });
    }
  }

  private static collectGoTests(
    filePath: string,
    content: string,
    examples: any[],
  ) {
    const re = /^func\s+(Test\w+)\s*\(/gm;
    let m: RegExpExecArray | null;
    while ((m = re.exec(content)) !== null) {
      if (examples.length >= 15) break;
      const block = content.slice(m.index, m.index + 700);
      examples.push({
        description: m[1]!,
        code: block.trim(),
        file: filePath,
      });
    }
  }
}
