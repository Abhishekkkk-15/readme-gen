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
    const packageFiles = Object.keys(files).filter(f => f.endsWith('package.json'));
    
    if (packageFiles.length > 0) {
      return this.parseMultipleNode(packageFiles, files);
    }

    if (files['requirements.txt'] || files['pyproject.toml']) {
      return this.parsePython(files['requirements.txt'] || '', files['pyproject.toml'] || '');
    }
    if (files['go.mod']) {
      return this.parseGo(files['go.mod']);
    }
    return null;
  }

  private static parseMultipleNode(packagePaths: string[], allFiles: Record<string, string>): PackageMetadata {
    const mergedScripts: Record<string, string> = {};
    const mergedDeps = new Set<string>();
    const mergedDevDeps = new Set<string>();
    const mergedPeerDeps = new Set<string>();
    const mergedFrameworks = new Set<string>();
    
    let primaryName = '';
    let primaryDescription = '';
    let primaryVersion = '0.0.0';

    // Sort paths by depth (shallowest first) to pick primary metadata from root
    const sortedPaths = [...packagePaths].sort((a, b) => a.split('/').length - b.split('/').length);

    sortedPaths.forEach((path, index) => {
      try {
        const pkg = JSON.parse(allFiles[path]);
        // Normalize path for splitting
        const normalizedPath = path.replace(/\\/g, '/');
        const prefix = normalizedPath.includes('/') ? `${normalizedPath.split('/')[0]}:` : '';

        // If no primary metadata yet, or if current one is more descriptive, pick it
        if (!primaryName || (index === 0 && pkg.name)) {
          primaryName = pkg.name || primaryName;
          primaryDescription = pkg.description || primaryDescription;
          primaryVersion = pkg.version || primaryVersion;
        }

        // Merge scripts with prefix if not root
        if (pkg.scripts) {
          Object.entries(pkg.scripts as Record<string, string>).forEach(([name, cmd]) => {
            const key = prefix ? `${prefix}${name}` : name;
            mergedScripts[key] = cmd;
          });
        }

        // Merge dependencies
        if (pkg.dependencies) {
          Object.keys(pkg.dependencies).forEach(d => {
            mergedDeps.add(d);
            this.detectFramework(d, mergedFrameworks);
          });
        }
        if (pkg.devDependencies) {
          Object.keys(pkg.devDependencies).forEach(d => mergedDevDeps.add(d));
        }
        if (pkg.peerDependencies) {
          Object.keys(pkg.peerDependencies).forEach(d => mergedPeerDeps.add(d));
        }
      } catch (e) {
        console.warn(`Failed to parse ${path}:`, e);
      }
    });

    let packageManager = 'npm';
    if (Object.keys(allFiles).some(f => f.includes('pnpm-lock.yaml'))) packageManager = 'pnpm';
    else if (Object.keys(allFiles).some(f => f.includes('yarn.lock'))) packageManager = 'yarn';

    return {
      name: primaryName || 'Unknown Node Project',
      version: primaryVersion,
      description: primaryDescription,
      scripts: mergedScripts,
      dependencies: {
        production: Array.from(mergedDeps),
        development: Array.from(mergedDevDeps),
        peer: Array.from(mergedPeerDeps),
      },
      frameworks: Array.from(mergedFrameworks),
      packageManager,
    };
  }

  private static detectFramework(dep: string, frameworks: Set<string>) {
    const frameworkMap: Record<string, string> = {
      'express': 'Express',
      'react': 'React',
      'next': 'Next.js',
      'vue': 'Vue',
      '@nestjs/core': 'NestJS',
      'koa': 'Koa',
      'fastify': 'Fastify',
      'socket.io': 'Socket.io',
      'mongoose': 'Mongoose',
      'prisma': 'Prisma',
      'tailwindcss': 'TailwindCSS',
      'vite': 'Vite'
    };

    if (frameworkMap[dep]) frameworks.add(frameworkMap[dep]);
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
