import { Project, SyntaxKind, ClassDeclaration, FunctionDeclaration, InterfaceDeclaration, TypeAliasDeclaration, ParameterDeclaration } from 'ts-morph';

export class DefinitionExtractor {
  public static extract(files: Record<string, string>): Record<string, string[]> {
    const project = new Project({ useInMemoryFileSystem: true });
    const result: Record<string, string[]> = {};

    // First Pass: Load all files to allow for cross-file type resolution if needed
    for (const [filePath, content] of Object.entries(files)) {
      if (!filePath.match(/\.(ts|js|tsx|jsx)$/)) continue;
      project.createSourceFile(filePath, content);
    }

    // Second Pass: Safe extraction
    project.getSourceFiles().forEach(sourceFile => {
      const filePath = sourceFile.getFilePath();
      const definitions: string[] = [];

      // Extract Import Declarations
      sourceFile.getImportDeclarations().forEach(imp => {
        const module = imp.getModuleSpecifierValue();
        const names = imp.getNamedImports().map(n => n.getName()).join(', ');
        definitions.push(`Import: ${names} from "${module}"`);
      });

      // Extract Classes
      sourceFile.getClasses().forEach(cls => {
        if (cls.isExported() || cls.getMethods().length > 0) {
          // Limit to avoid context explosion
          definitions.push(`Class: ${cls.getName()}\n${cls.getText().substring(0, 1000)}...`);
        }
      });

      // Extract Functions (Safe)
      sourceFile.getFunctions().forEach(fn => {
        const name = fn.getName();
        if (fn.isExported() || name?.match(/handle|get|post|put|delete|update/i)) {
          const params = fn.getParameters().map(p => {
            const type = this.safeGetParamType(p);
            return `${p.getName()}: ${type}`;
          }).join(', ');
          
          const returnType = this.safeGetReturnType(fn);
          const asyncStr = fn.isAsync() ? 'async ' : '';
          
          definitions.push(`${asyncStr}Function: ${name}(${params}): ${returnType}`);
        }
      });

      // Extract Arrow Functions
      sourceFile.getVariableDeclarations().forEach(v => {
        const initializer = v.getInitializer();
        if (initializer && initializer.getKind() === SyntaxKind.ArrowFunction) {
          definitions.push(`Variable Arrow Function: ${v.getName()}`);
        }
      });

      // Extract Interfaces/Types
      sourceFile.getInterfaces().forEach(intf => {
        if (intf.isExported()) {
          definitions.push(`Interface: ${intf.getName()}\n${intf.getText().substring(0, 500)}`);
        }
      });

      sourceFile.getTypeAliases().forEach(type => {
        if (type.isExported()) {
          definitions.push(`Type: ${type.getName()}\n${type.getText().substring(0, 500)}`);
        }
      });

      // Capture route declarations and controllers
      sourceFile.getVariableStatements().forEach(varStmt => {
        const text = varStmt.getText();
        if (text.includes('router.') || text.includes('app.') || text.includes('express.')) {
          definitions.push(`Routing Logic: ${text}`);
        }
      });

      if (definitions.length > 0) {
        // Strip the leading slash from filePath if it exists (for consistency)
        const cleanPath = filePath.startsWith('/') ? filePath.substring(1) : filePath;
        result[cleanPath] = definitions;
      }
    });

    return result;
  }

  private static safeGetParamType(p: ParameterDeclaration): string {
    try {
      // 1. Try syntactic type node first (Safest)
      const typeNode = p.getTypeNode();
      if (typeNode) return typeNode.getText();
      
      // 2. Try semantic type checker inside a try/catch
      return p.getType().getText();
    } catch (e) {
      return 'any';
    }
  }

  private static safeGetReturnType(fn: FunctionDeclaration): string {
    try {
      // 1. Try syntactic first
      const typeNode = fn.getReturnTypeNode();
      if (typeNode) return typeNode.getText();

      // 2. Try semantic
      return fn.getReturnType().getText();
    } catch (e) {
      return 'void | any';
    }
  }
}
