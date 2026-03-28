  import path from 'path';

interface PackageMetadata {
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

export class PackageExtractor {
  public static async extract(files: Record<string, string>): Promise<PackageMetadata | null> {
    if (files['package.json']) {
      return this.extractNode(files['package.json'], files);
    }
    if (files['requirements.txt'] || files['pyproject.toml']) {
      return this.extractPython(files['requirements.txt'] || '', files['pyproject.toml'] || '');
    }
    if (files['go.mod']) {
      return this.extractGo(files['go.mod']);
    }
    return null;
  }

  private static extractNode(content: string, allFiles: Record<string, string>): PackageMetadata {
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
  }

  private static extractPython(reqs: string, pyproject: string): PackageMetadata {
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

  private static extractGo(content: string): PackageMetadata {
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
