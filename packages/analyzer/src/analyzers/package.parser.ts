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

    const req = files['requirements.txt'] || '';
    const pyproject = files['pyproject.toml'] || '';
    if (req || pyproject) {
      return this.parsePython(req, pyproject);
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
        const parts = normalizedPath.split('/');
        
        // If it's a nested package (e.g., apps/api/package.json), prefix with the directory path
        let prefix = '';
        if (parts.length > 1) {
          const dirParts = parts.slice(0, -1);
          prefix = dirParts.join('/') + ':';
        }

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
    else if (Object.keys(allFiles).some(f => f.endsWith('bun.lockb'))) packageManager = 'bun';

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
    const py = pyproject ? this.parsePyProjectToml(pyproject) : null;
    const reqDeps = this.parseRequirementsTxt(reqs);
    const prod = Array.from(
      new Set([...(py?.deps || []), ...reqDeps]),
    );
    const dev = py?.devDeps || [];

    const frameworks = this.detectPythonFrameworks(prod, dev, pyproject + reqs);

    const scripts: Record<string, string> = { ...py?.scripts };
    if (frameworks.includes('Django') && !scripts['manage']) {
      scripts['manage'] = 'python manage.py <command>';
    }

    const packageManager = this.detectPythonPm(pyproject);

    return {
      name: py?.name || 'Python Project',
      version: py?.version || '1.0.0',
      description: py?.description || '',
      scripts,
      dependencies: {
        production: prod,
        development: dev,
        peer: [],
      },
      frameworks,
      packageManager,
    };
  }

  private static detectPythonPm(pyproject: string): string {
    if (!pyproject) return 'pip';
    if (/\[tool\.poetry\]/i.test(pyproject)) return 'poetry';
    if (/\[tool\.uv\]/i.test(pyproject) || /uv\.lock/i.test(pyproject))
      return 'uv';
    if (/\[tool\.pdm\]/i.test(pyproject)) return 'pdm';
    if (/\[tool\.hatch\]/i.test(pyproject)) return 'hatch';
    return 'pip';
  }

  private static parseRequirementsTxt(content: string): string[] {
    const names: string[] = [];
    for (const line of content.split('\n')) {
      const name = this.parseRequirementLine(line);
      if (name) names.push(name);
    }
    return names;
  }

  /** pip / requirements.txt line → distribution name */
  private static parseRequirementLine(line: string): string | null {
    const t = line.trim();
    if (!t || t.startsWith('#') || t.startsWith('-')) return null;
    const head = t.split(/[;#]/)[0]!.trim();
    if (!head) return null;
    const noVersion = head.split(/\s*[<>=~!]/)[0]!.trim();
    const noExtra = noVersion.split(/[\[]/)[0]!.trim();
    const name = noExtra.split(/[@\s]/)[0]!.trim();
    if (!name || !/^[a-zA-Z0-9._-]+$/.test(name)) return null;
    return name;
  }

  private static parsePyProjectToml(content: string): {
    name?: string;
    version?: string;
    description?: string;
    deps: string[];
    devDeps: string[];
    scripts: Record<string, string>;
  } {
    const deps: string[] = [];
    const devDeps: string[] = [];
    const scripts: Record<string, string> = {};
    let name: string | undefined;
    let version: string | undefined;
    let description: string | undefined;

    let section = '';
    const lines = content.split('\n');
    for (const raw of lines) {
      const line = raw.split('#')[0]!.trim();
      const sec = line.match(/^\[([^\]]+)\]/);
      if (sec) {
        section = sec[1]!.toLowerCase();
        continue;
      }
      if (section === 'project') {
        const nm = line.match(/^name\s*=\s*["']([^"']+)["']/i);
        const ver = line.match(/^version\s*=\s*["']([^"']+)["']/i);
        const desc = line.match(/^description\s*=\s*["']([^"']*)["']/i);
        if (nm) name = nm[1];
        if (ver) version = ver[1];
        if (desc) description = desc[1];
      }
      if (
        section === 'tool.poetry.dependencies' ||
        section === 'tool.poetry.group.dev.dependencies'
      ) {
        const depKey = line.match(/^([a-zA-Z0-9_.-]+)\s*=/);
        if (depKey && depKey[1]!.toLowerCase() !== 'python') {
          if (section.includes('dev')) devDeps.push(depKey[1]!);
          else deps.push(depKey[1]!);
        }
      }
      if (section === 'tool.poetry.scripts') {
        const sc = line.match(/^([a-zA-Z0-9_.-]+)\s*=\s*["']([^"']+)["']/);
        if (sc) scripts[sc[1]!] = sc[2]!;
      }
    }

    return { name, version, description, deps, devDeps, scripts };
  }

  private static detectPythonFrameworks(
    prod: string[],
    dev: string[],
    raw: string,
  ): string[] {
    const all = [...prod, ...dev].map((d) => d.toLowerCase());
    const text = raw.toLowerCase();
    const frameworks: string[] = [];
    const add = (f: string) => {
      if (!frameworks.includes(f)) frameworks.push(f);
    };
    const has = (s: string) =>
      all.some((d) => d.includes(s)) || text.includes(s);
    if (has('fastapi')) add('FastAPI');
    if (has('flask')) add('Flask');
    if (has('django')) add('Django');
    if (has('starlette')) add('Starlette');
    if (has('tornado')) add('Tornado');
    if (has('sanic')) add('Sanic');
    if (has('litestar')) add('Litestar');
    if (has('sqlalchemy')) add('SQLAlchemy');
    if (has('pydantic')) add('Pydantic');
    if (has('celery')) add('Celery');
    if (has('pytest')) add('pytest');
    return frameworks;
  }

  private static parseGo(content: string): PackageMetadata {
    const lines = content.split('\n');
    const moduleLine = lines.find((l) => l.trim().startsWith('module '));
    const name = moduleLine
      ? moduleLine.replace(/^\s*module\s+/, '').trim().split(/\s+/)[0]!
      : 'Go Project';

    const modules = this.parseGoRequireBlock(content);
    const frameworks = this.detectGoFrameworks(modules);

    const scripts: Record<string, string> = {
      build: 'go build ./...',
      test: 'go test ./...',
      vet: 'go vet ./...',
      mod: 'go mod tidy',
    };

    return {
      name,
      version: '1.0.0',
      description: '',
      scripts,
      dependencies: {
        production: modules,
        development: [],
        peer: [],
      },
      frameworks,
      packageManager: 'go mod',
    };
  }

  private static parseGoRequireBlock(content: string): string[] {
    const mods: string[] = [];
    const lines = content.split('\n');
    let inBlock = false;
    for (const raw of lines) {
      const line = raw.trim();
      if (line.startsWith('require (')) {
        inBlock = true;
        continue;
      }
      if (inBlock && line === ')') {
        inBlock = false;
        continue;
      }
      if (inBlock && line && !line.startsWith('//') && !line.startsWith('replace ')) {
        const modPath = line.split(/\s+/)[0]!;
        if (modPath) mods.push(modPath);
        continue;
      }
      if (line.startsWith('require ') && !line.includes('(')) {
        const rest = line.replace(/^require\s+/, '').trim();
        const modPath = rest.split(/\s+/)[0]!;
        if (modPath && !modPath.startsWith('//')) mods.push(modPath);
      }
    }
    return Array.from(new Set(mods));
  }

  private static detectGoFrameworks(modules: string[]): string[] {
    const frameworks: string[] = [];
    const add = (f: string) => {
      if (!frameworks.includes(f)) frameworks.push(f);
    };
    const s = modules.join(' ').toLowerCase();
    const pairs: [string, string][] = [
      ['gin-gonic/gin', 'Gin'],
      ['labstack/echo', 'Echo'],
      ['gofiber/fiber', 'Fiber'],
      ['go-chi/chi', 'chi'],
      ['gorilla/mux', 'Gorilla mux'],
      ['google.golang.org/grpc', 'gRPC'],
      ['grpc-go', 'gRPC'],
      ['grpc/grpc-go', 'gRPC'],
      ['spf13/cobra', 'Cobra'],
      ['spf13/viper', 'Viper'],
      ['stretchr/testify', 'testify'],
      ['jackc/pgx', 'pgx'],
      ['go-redis/redis', 'Redis'],
      ['gorm.io/gorm', 'GORM'],
      ['entgo.io/ent', 'Ent'],
    ];
    for (const [needle, label] of pairs) {
      if (s.includes(needle)) add(label);
    }
    return frameworks;
  }
}
