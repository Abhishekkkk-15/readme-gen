import path from 'path';

interface EnvVar {
  name: string;
  required: boolean;
  defaultValue?: string;
  description: string;
}

export class ConfigExtractor {
  public static extract(files: Record<string, string>): { envVars: EnvVar[]; configFiles: string[] } {
    const envVars: EnvVar[] = [];
    const configFiles: string[] = [];

    // 1. Detect config files
    const configExt = ['config.js', 'settings.py', 'application.yml', 'config.ts', '.env', '.env.example'];
    for (const file of Object.keys(files)) {
      if (configExt.some(ext => file.endsWith(ext))) {
        configFiles.push(file);
      }
    }

    // 2. Extract env vars from .env.example or .env
    const envFile = files['.env.example'] || files['.env'];
    if (envFile) {
      envFile.split('\n').forEach(line => {
        const trimmed = line.trim();
        if (trimmed && !trimmed.startsWith('#')) {
          const [key, ...rest] = trimmed.split('=');
          const value = rest.join('=').trim();
          
          envVars.push({
            name: key.trim(),
            required: !value,
            defaultValue: value,
            description: this.tryGetDescription(line, envFile)
          });
        }
      });
    }

    return { envVars, configFiles };
  }

  private static tryGetDescription(line: string, allContent: string): string {
    const lines = allContent.split('\n');
    const index = lines.indexOf(line);
    if (index > 0) {
      const prevLine = lines[index - 1].trim();
      if (prevLine.startsWith('#')) {
        return prevLine.substring(1).trim();
      }
    }
    return '';
  }
}
