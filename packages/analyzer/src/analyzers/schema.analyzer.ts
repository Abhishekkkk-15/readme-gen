import { Project, SyntaxKind, ObjectLiteralExpression } from 'ts-morph';

export class SchemaAnalyzer {
  public static analyze(files: Record<string, string>) {
    const schemas: any[] = [];
    const project = new Project({ useInMemoryFileSystem: true });

    for (const [filePath, content] of Object.entries(files)) {
      // 1. Prisma
      if (filePath.endsWith('.prisma')) {
        const models = [...content.matchAll(/model\s+([A-Za-z0-9_-]+)\s+\{([\s\S]+?)\}/g)];
        models.forEach(m => {
          const fields = m[2].trim().split('\n')
            .map(l => l.trim())
            .filter(l => l && !l.startsWith('//') && !l.startsWith('@@'))
            .map(l => l.split(/\s+/)[0]);
          schemas.push({ model: m[1], fields, file: filePath });
        });
        continue;
      }

      // 2. Mongoose (ST)
      if (filePath.match(/\.(ts|js|tsx|jsx)$/)) {
        const sourceFile = project.createSourceFile(filePath, content);
        const newExpressions = sourceFile.getDescendantsOfKind(SyntaxKind.NewExpression);
        
        for (const newExpr of newExpressions) {
          if (newExpr.getExpression().getText().includes('Schema')) {
            const args = newExpr.getArguments();
            if (args.length > 0 && Node.isObjectLiteralExpression(args[0])) {
                const fields = (args[0] as ObjectLiteralExpression).getProperties().map(p => p.getText().split(':')[0].trim());
                // Try to find model name from the same file
                const modelName = content.match(/mongoose\.model\(['"]([^'"]+)['"]/)?.[1] || "UnknownModel";
                schemas.push({ model: modelName, fields, file: filePath });
            }
          }
        }
      }
    }

    return schemas.length > 0 ? schemas : undefined;
  }
}

// Helper needed because Node is not imported in this scope correctly for isObjectLiteral
const Node = {
    isObjectLiteralExpression: (node: any): node is ObjectLiteralExpression => {
        return node.getKind() === SyntaxKind.ObjectLiteralExpression;
    }
}
