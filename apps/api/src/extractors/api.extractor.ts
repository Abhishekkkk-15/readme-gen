interface ApiEndpoint {
  method: string;
  path: string;
  handler: string;
}

export class ApiExtractor {
  /**
   * Detects API routes from file content based on framework patterns.
   */
  public static extract(content: string, filePath: string): ApiEndpoint[] {
    const fileExt = filePath.split('.').pop() || '';
    if (['ts', 'js'].includes(fileExt)) {
      return this.extractNodeApi(content);
    }
    if (fileExt === 'py') {
      return this.extractPythonApi(content);
    }
    return [];
  }

  private static extractNodeApi(content: string): ApiEndpoint[] {
    const endpoints: ApiEndpoint[] = [];
    
    // Express pattern: router.get('/path', (req, res) => ...) or app.post('/path', ...)
    const expressRegex = /(?:router|app)\.(get|post|put|delete|patch|use)\s*\(\s*['"]([^'"]+)['"]\s*,\s*(?:[a-zA-Z0-9_\.]+|async\s*\([^\)]*\)\s*=>)/g;
    let match;
    while ((match = expressRegex.exec(content)) !== null) {
      endpoints.push({
        method: match[1].toUpperCase(),
        path: match[2],
        handler: '匿名',
      });
    }

    return endpoints;
  }

  private static extractPythonApi(content: string): ApiEndpoint[] {
    const endpoints: ApiEndpoint[] = [];

    // FastAPI/Flask pattern: @app.get('/path')
    const pyRegex = /@(?:app|router|blueprint)\.(get|post|put|delete|patch)\s*\(\s*['"]([^'"]+)['"]\s*\)/g;

    const pyAltRegex = /@(?:app|router|blueprint)\.(get|post|put|delete|patch)\s*\(\s*['"]([^'"]+)['"]\s*\)\s*[\r\n]+\s*(?:async\s+)?def\s+([a-zA-Z0-9_]+)/g;
    let match;
    while ((match = pyAltRegex.exec(content)) !== null) {
      endpoints.push({
        method: match[1].toUpperCase(),
        path: match[2],
        handler: match[3],
      });
    }

    return endpoints;
  }
}
