import { Project, SyntaxKind, ClassDeclaration, FunctionDeclaration, InterfaceDeclaration, TypeAliasDeclaration } from 'ts-morph';

export class DefinitionExtractor {
  public static extract(files: Record<string, string>): Record<string, string[]> {
    const project = new Project({ useInMemoryFileSystem: true });
    const result: Record<string, string[]> = {};

    for (const [filePath, content] of Object.entries(files)) {
      if (!filePath.match(/\.(ts|js|tsx|jsx)$/)) continue;

      const sourceFile = project.createSourceFile(filePath, content);
      const definitions: string[] = [];

      // Extract Classes (e.g., Controllers, Services)
      sourceFile.getClasses().forEach(cls => {
        // Only extract if it has methods or is exported
        if (cls.isExported() || cls.getMethods().length > 0) {
          // We limit the length to avoid overwhelming the LLM, but still keep the core body
          definitions.push(cls.getText().substring(0, 2000));
        }
      });

      // Extract Functions (e.g., Route handlers, Helpers)
      sourceFile.getFunctions().forEach(fn => {
        if (fn.isExported() || fn.getName()?.match(/handle|get|post|put|delete|update/i)) {
          definitions.push(fn.getText().substring(0, 1500));
        }
      });

      // Extract Interfaces/Types (to understand data models)
      sourceFile.getInterfaces().forEach(intf => {
        if (intf.isExported()) {
          definitions.push(intf.getText());
        }
      });

      sourceFile.getTypeAliases().forEach(type => {
        if (type.isExported()) {
          definitions.push(type.getText());
        }
      });

      // Also grab variable statements that might be route definitions (const router = ...)
      sourceFile.getVariableStatements().forEach(varStmt => {
        const text = varStmt.getText();
        if (text.includes('router.') || text.includes('app.') || text.includes('express.')) {
          definitions.push(text);
        }
      });

      if (definitions.length > 0) {
        result[filePath] = definitions;
      }
    }

    return result;
  }
}
