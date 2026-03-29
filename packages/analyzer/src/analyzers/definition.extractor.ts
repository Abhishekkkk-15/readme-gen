import { 
  Project, 
  SyntaxKind, 
  ClassDeclaration, 
  FunctionDeclaration, 
  InterfaceDeclaration, 
  TypeAliasDeclaration, 
  ParameterDeclaration,
  MethodDeclaration,
  ArrowFunction,
  Node
} from 'ts-morph';

export class DefinitionExtractor {
  public static extract(files: Record<string, string>): Record<string, string[]> {
    const project = new Project({ useInMemoryFileSystem: true });
    const result: Record<string, string[]> = {};

    for (const [filePath, content] of Object.entries(files)) {
      if (!filePath.match(/\.(ts|js|tsx|jsx)$/)) continue;
      project.createSourceFile(filePath, content);
    }

    project.getSourceFiles().forEach(sourceFile => {
      const filePath = sourceFile.getFilePath();
      const definitions: string[] = [];

      // Extract Imports
      sourceFile.getImportDeclarations().forEach(imp => {
        const module = imp.getModuleSpecifierValue();
        const names = imp.getNamedImports().map(n => n.getName()).join(', ');
        if (names) definitions.push(`Import: { ${names} } from "${module}"`);
        else if (imp.getDefaultImport()) definitions.push(`Import Default: ${imp.getDefaultImport()?.getText()} from "${module}"`);
      });

      // Recursive Extraction from all top-level nodes
      sourceFile.forEachChild(node => {
        this.walkNode(node, definitions);
      });

      // Interfaces/Types (Stay top-level mostly)
      sourceFile.getInterfaces().forEach(intf => {
        const name = intf.getName();
        const properties = intf.getProperties().map(p => `${p.getName()}: ${p.getType().getText()}`).join(', ');
        definitions.push(`Interface: ${name} { ${properties.substring(0, 200)} }`);
      });

      sourceFile.getTypeAliases().forEach(type => {
        definitions.push(`Type Alias: ${type.getName()} = ${type.getType().getText().substring(0, 200)}`);
      });

      if (definitions.length > 0) {
        const cleanPath = filePath.startsWith('/') ? filePath.substring(1) : filePath;
        result[cleanPath] = definitions;
      }
    });

    return result;
  }

  private static walkNode(node: Node, definitions: string[]) {
    // Classes
    if (Node.isClassDeclaration(node)) {
      const name = node.getName() || "AnonymousClass";
      definitions.push(`Class: ${name}`);
      node.getMethods().forEach(m => definitions.push(`  ${this.formatSignature(m, 'Method')}`));
      node.getConstructors().forEach(c => definitions.push(`  ${this.formatSignature(c, 'Constructor')}`));
    }

    // Functions
    if (Node.isFunctionDeclaration(node)) {
      definitions.push(this.formatSignature(node, 'Function'));
    }

    // Variable-based Functions (Arrow or Function Expressions)
    if (Node.isVariableDeclaration(node)) {
      const initializer = node.getInitializer();
      if (initializer) {
        if (Node.isArrowFunction(initializer) || Node.isFunctionExpression(initializer)) {
          const name = node.getName();
          const params = this.formatSignature(initializer, 'Function (assigned)');
          definitions.push(params);
        } else if (Node.isObjectLiteralExpression(initializer)) {
          // If it's a small object literal with methods, extract them
          initializer.getProperties().forEach(prop => {
            if (Node.isMethodDeclaration(prop) || Node.isPropertyAssignment(prop)) {
              const propInit = Node.isPropertyAssignment(prop) ? prop.getInitializer() : null;
              if (Node.isMethodDeclaration(prop) || (propInit && (Node.isArrowFunction(propInit) || Node.isFunctionExpression(propInit)))) {
                const name = Node.isPropertyAssignment(prop) ? prop.getName() : (prop as any).getName();
                const fn = Node.isPropertyAssignment(prop) ? (propInit as any) : prop;
                definitions.push(`  Method (obj-prop): ${name}${this.formatParamsSnippet(fn)}`);
              }
            }
          });
        }
      }
    }

    // Export Assignments
    if (Node.isExportAssignment(node)) {
      const expression = node.getExpression();
      if (Node.isArrowFunction(expression) || Node.isFunctionExpression(expression)) {
        definitions.push(`Export Default Function: ${this.formatSignature(expression, '')}`);
      }
    }

    // Recurse into children to find nested functions (but not too deep into implementations)
    if (!Node.isClassDeclaration(node) && !Node.isFunctionDeclaration(node) && !Node.isMethodDeclaration(node)) {
      node.forEachChild(child => this.walkNode(child, definitions));
    }
  }

  private static formatSignature(node: any, kind: string): string {
    const name = node.getName?.() || "";
    const params = this.formatParamsSnippet(node);
    const asyncStr = node.isAsync?.() ? 'async ' : '';
    return `${asyncStr}${kind}${name ? ': ' + name : ''}${params}`;
  }

  private static formatParamsSnippet(node: any): string {
    const params = this.formatParams(node.getParameters?.() || []);
    const returnType = this.safeGetReturnType(node);
    return `(${params}) -> ${returnType}`;
  }

  private static formatParams(params: ParameterDeclaration[]): string {
    return params.map(p => {
      const name = p.getName();
      const type = this.safeGetParamType(p);
      return `${name}${p.isOptional() ? '?' : ''}: ${type}`;
    }).join(', ');
  }

  private static safeGetParamType(p: ParameterDeclaration): string {
    try {
      return p.getTypeNode()?.getText() || p.getType().getText() || 'any';
    } catch { return 'any'; }
  }

  private static safeGetReturnType(fn: any): string {
    try {
      return fn.getReturnTypeNode()?.getText() || fn.getReturnType().getText() || 'void';
    } catch { return 'void'; }
  }
}
