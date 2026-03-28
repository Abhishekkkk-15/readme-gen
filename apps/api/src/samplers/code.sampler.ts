export interface CodeSample {
  filePath: string;
  imports: string[];
  exports: string[];
  signatures: string[];
  docstrings: string[];
}

export class CodeSampler {
  public static sample(content: string, filePath: string): CodeSample {
    const lines = content.split('\n');
    const first20 = lines.slice(0, 20);
    const last20 = lines.slice(-20);

    const imports: string[] = [];
    const exports: string[] = [];
    const signatures: string[] = [];
    const docstrings: string[] = [];

    // Simple regex patterns for imports/exports/signatures
    const importRegex = /^(import|require|from)\s+/;
    const exportRegex = /^export\s+(?:async\s+)?(?:function|class|const|let|var)\s+([a-zA-Z0-9_]+)/;
    const pyDefRegex = /^(?:async\s+)?def\s+([a-zA-Z0-9_]+)\s*\(([^\)]*)\)/;
    const tsFuncRegex = /^(?:export\s+)?(?:async\s+)?function\s+([a-zA-Z0-9_]+)\s*\(([^\)]*)\)/;
    const tsMethodRegex = /^\s+(?:public|private|protected)?\s*(?:async\s+)?([a-zA-Z0-9_]+)\s*\(([^\)]*)\)/;

    first20.forEach(l => {
      const trimmed = l.trim();
      if (importRegex.test(trimmed)) imports.push(trimmed);
      if (trimmed.startsWith('/**') || trimmed.startsWith('"""')) docstrings.push(trimmed);
    });

    lines.forEach(l => {
      const trimmed = l.trim();
      const exportMatch = trimmed.match(exportRegex);
      if (exportMatch) exports.push(exportMatch[1]);

      const tsFuncMatch = trimmed.match(tsFuncRegex);
      if (tsFuncMatch) signatures.push(`${tsFuncMatch[1]}(${tsFuncMatch[2]})`);

      const pyDefMatch = trimmed.match(pyDefRegex);
      if (pyDefMatch) signatures.push(`${pyDefMatch[1]}(${pyDefMatch[2]})`);
    });

    return {
      filePath,
      imports,
      exports,
      signatures: signatures.slice(0, 10),
      docstrings: docstrings.slice(0, 5),
    };
  }
}
