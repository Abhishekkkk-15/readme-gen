import { Project, SyntaxKind, CallExpression } from 'ts-morph';

export class ExampleAnalyzer {
  public static analyze(files: Record<string, string>) {
    const examples: any[] = [];
    const project = new Project({ useInMemoryFileSystem: true });

    for (const [filePath, content] of Object.entries(files)) {
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
}
