export interface PackageMetadata {
  name: string;
  version: string;
  description: string;
  scripts: Record<string, string>;
  dependencies: {
    production: string[];
    development: string[];
    peer: string[];
  };
  frameworks: string[];
  packageManager: string;
}

export class PackageParser {
  public static async parse(files: Record<string, string>): Promise<PackageMetadata | null> {
    if (files['package.json']) {
      return this.parseNode(files['package.json'], files);
    }
    if (files['requirements.txt'] || files['pyproject.toml']) {
      return this.parsePython(files['requirements.txt'] || '', files['pyproject.toml'] || '');
    }
    if (files['go.mod']) {
      return this.parseGo(files['go.mod']);
    }
    return null;
  }

  private static parseNode(content: string, allFiles: Record<string, string>): PackageMetadata {
    try {
      const pkg = JSON.parse(content);
      const deps = pkg.dependencies || {};
      const devDeps = pkg.devDependencies || {};
      const peerDeps = pkg.peerDependencies || {};

      const frameworks: string[] = [];
      if (deps['express']) frameworks.push('Express');
      if (deps['react']) frameworks.push('React');
      if (deps['next']) frameworks.push('Next.js');
      if (deps['vue']) frameworks.push('Vue');
      if (deps['@nestjs/core']) frameworks.push('NestJS');
      if (deps['koa']) frameworks.push('Koa');
      if (deps['fastify']) frameworks.push('Fastify');

      let packageManager = 'npm';
      if (allFiles['pnpm-lock.yaml']) packageManager = 'pnpm';
      else if (allFiles['yarn.lock']) packageManager = 'yarn';

      return {
        name: pkg.name || '',
        version: pkg.version || '0.0.0',
        description: pkg.description || '',
        scripts: pkg.scripts || {},
        dependencies: {
          production: Object.keys(deps),
          development: Object.keys(devDeps),
          peer: Object.keys(peerDeps),
        },
        frameworks,
        packageManager,
      };
    } catch {
      return {
        name: 'Unknown Node Project',
        version: '0.0.0',
        description: '',
        scripts: {},
        dependencies: { production: [], development: [], peer: [] },
        frameworks: [],
        packageManager: 'npm',
      };
    }
  }

  private static parsePython(reqs: string, pyproject: string): PackageMetadata {
    const frameworks: string[] = [];
    if (reqs.includes('fastapi') || pyproject.includes('fastapi')) frameworks.push('FastAPI');
    if (reqs.includes('flask') || pyproject.includes('flask')) frameworks.push('Flask');
    if (reqs.includes('django') || pyproject.includes('django')) frameworks.push('Django');

    return {
      name: 'Python Project',
      version: '1.0.0',
      description: '',
      scripts: {},
      dependencies: {
        production: reqs.split('\n').filter(l => l.trim() && !l.startsWith('#')),
        development: [],
        peer: [],
      },
      frameworks,
      packageManager: pyproject ? 'poetry/pip' : 'pip',
    };
  }

  private static parseGo(content: string): PackageMetadata {
    const lines = content.split('\n');
    const moduleLine = lines.find(l => l.startsWith('module '));
    const name = moduleLine ? moduleLine.replace('module ', '').trim() : 'Go Project';

    return {
      name,
      version: '1.0.0',
      description: '',
      scripts: {},
      dependencies: {
        production: lines.filter(l => l.includes('require')).map(l => l.trim()),
        development: [],
        peer: [],
      },
      frameworks: [],
      packageManager: 'go mod',
    };
  }
}
