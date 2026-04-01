export interface EnvVar {
  name: string;
}

export class EnvExtractor {
  private static ENV_REGEX = /process\.env\.([a-zA-Z_][a-zA-Z0-9_]*)/g;

  public static extract(files: Record<string, string>): string[] {
    const envVars = new Set<string>();

    for (const [filePath, content] of Object.entries(files)) {
      // 1. From .env or .env.example
      if (filePath.endsWith('.env') || filePath.endsWith('.env.example')) {
        const lines = content.split('\n');
        for (const line of lines) {
          const trimmed = line.trim();
          if (trimmed && !trimmed.startsWith('#')) {
            const match = trimmed.match(/^([^=]+)=/);
            if (match) {
              envVars.add(match[1].trim());
            }
          }
        }
      }

      // 2. From code usage (process.env.VAR)
      if (filePath.endsWith('.ts') || filePath.endsWith('.js')) {
        let match;
        while ((match = this.ENV_REGEX.exec(content)) !== null) {
          envVars.add(match[1]);
        }
      }

      if (filePath.endsWith('.py')) {
        for (const m of content.matchAll(
          /os\.(?:getenv|environ\.get)\(\s*["']([a-zA-Z_][a-zA-Z0-9_]*)["']/g,
        )) {
          envVars.add(m[1]!);
        }
        for (const m of content.matchAll(
          /os\.environ\[\s*["']([a-zA-Z_][a-zA-Z0-9_]*)["']\s*\]/g,
        )) {
          envVars.add(m[1]!);
        }
      }

      if (filePath.endsWith('.go')) {
        for (const m of content.matchAll(
          /os\.Getenv\(\s*["']([a-zA-Z_][a-zA-Z0-9_]*)["']\s*\)/g,
        )) {
          envVars.add(m[1]!);
        }
      }
    }

    return Array.from(envVars);
  }
}
