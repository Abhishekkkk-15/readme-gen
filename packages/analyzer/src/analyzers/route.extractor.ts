import { Project, SyntaxKind, CallExpression, PropertyAccessExpression } from 'ts-morph';
import { PolyglotExtractors } from './polyglot.extractors';

export interface Route {
  method: string;
  path: string;
  file: string;
  snippet?: string;
}

export class RouteExtractor {
  private static METHODS = ['get', 'post', 'put', 'delete', 'patch', 'use'];

  public static extract(files: Record<string, string>): Route[] {
    const project = new Project({ useInMemoryFileSystem: true });
    const routes: Route[] = [];

    for (const [filePath, content] of Object.entries(files)) {
      if (!filePath.endsWith('.ts') && !filePath.endsWith('.js') && !filePath.endsWith('.tsx') && !filePath.endsWith('.jsx')) {
        continue;
      }

      const sourceFile = project.createSourceFile(filePath, content);
      
      // Look for call expressions like app.get('/', ...) or router.post('/', ...)
      const callExpressions = sourceFile.getDescendantsOfKind(SyntaxKind.CallExpression);

      for (const call of callExpressions) {
        const expression = call.getExpression();
        
        if (expression.getKind() === SyntaxKind.PropertyAccessExpression) {
          const pae = expression as PropertyAccessExpression;
          const methodName = pae.getName().toLowerCase();
          
          if (this.METHODS.includes(methodName)) {
            const args = call.getArguments();
            if (args.length > 0 && args[0].getKind() === SyntaxKind.StringLiteral) {
              const routePath = args[0].getText().replace(/['"]/g, '');
              
              routes.push({
                method: methodName.toUpperCase(),
                path: routePath,
                file: filePath,
                snippet: call.getText().substring(0, 200) // snippet limited to 200 chars
              });
            }
          }
        }
      }
    }

    return [...routes, ...PolyglotExtractors.extractRoutes(files)];
  }
}
