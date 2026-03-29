import { ProjectAnalysis } from '../types';

export class SemanticRefiner {
  /**
   * Transforms raw analysis into a high-quality, semantically rich structure.
   */
  public static refine(analysis: any): any {
    const { dependencies = [], devDependencies = [], tree = [], framework, routes = [], envVars = [] } = analysis;
    const allDeps = [...dependencies, ...devDependencies];

    return {
      projectName: analysis.name || 'Untitled Project',
      description: analysis.description || 'No description provided.',
      
      techStack: {
        backend: this.detectBackend(allDeps, framework),
        frontend: this.detectFrontend(allDeps, framework),
        database: this.detectDatabase(allDeps),
        auth: this.detectAuth(allDeps),
        tooling: this.detectTooling(allDeps),
        ai: this.detectAI(allDeps)
      },

      architecture: this.detectArchitecture(analysis),
      
      features: this.enrichFeatures(analysis),
      
      api: {
        routes: routes.map((r: any) => ({
          method: r.method,
          path: r.path,
          purpose: this.inferRoutePurpose(r)
        })),
        totalEndpoints: routes.length
      },

      flows: this.inferFlows(analysis)
    };
  }

  private static detectBackend(deps: string[], framework?: any): string[] {
    const map: Record<string, string> = {
      'express': 'Express.js',
      'fastify': 'Fastify',
      'nestjs': 'NestJS',
      'koa': 'Koa',
      'hono': 'Hono',
      'apollo-server': 'GraphQL (Apollo)',
      'socket.io': 'Real-time (Socket.io)'
    };
    const found = deps.filter(d => map[d]).map(d => map[d]);
    if (framework?.name === 'Express') found.push('Express.js');
    return Array.from(new Set(found));
  }

  private static detectFrontend(deps: string[], framework?: any): string[] {
    const map: Record<string, string> = {
      'react': 'React',
      'vue': 'Vue',
      'svelte': 'Svelte',
      'next': 'Next.js',
      'nuxt': 'Nuxt.js',
      'tailwindcss': 'Tailwind CSS',
      'framer-motion': 'Animations (Framer Motion)',
      'lucide-react': 'Icons (Lucide)'
    };
    const found = deps.filter(d => map[d]).map(d => map[d]);
    return Array.from(new Set(found));
  }

  private static detectDatabase(deps: string[]): string[] {
    const map: Record<string, string> = {
      'prisma': 'Prisma ORM',
      'mongoose': 'MongoDB (Mongoose)',
      'sequelize': 'Sequelize ORM',
      'typeorm': 'TypeORM',
      'redis': 'Redis (Caching)',
      'pg': 'PostgreSQL'
    };
    return deps.filter(d => map[d]).map(d => map[d]);
  }

  private static detectAuth(deps: string[]): string[] {
    const map: Record<string, string> = {
      'passport': 'Passport.js',
      'next-auth': 'NextAuth.js',
      'jsonwebtoken': 'JWT Authentication',
      'bcrypt': 'Password Hashing (bcrypt)',
      'firebase': 'Firebase Auth'
    };
    return deps.filter(d => map[d]).map(d => map[d]);
  }

  private static detectTooling(deps: string[]): string[] {
    const map: Record<string, string> = {
      'typescript': 'TypeScript',
      'jest': 'Jest (Testing)',
      'vitest': 'Vitest (Testing)',
      'eslint': 'ESLint (Linting)',
      'prettier': 'Prettier (Formatting)',
      'turbo': 'Turborepo (Build system)'
    };
    return deps.filter(d => map[d]).map(d => map[d]);
  }

  private static detectAI(deps: string[]): string[] {
    const map: Record<string, string> = {
      'openai': 'OpenAI SDK',
      'langchain': 'LangChain (LLM Orchestration)',
      'groq': 'Groq AI',
      '@google/generative-ai': 'Google Gemini AI'
    };
    return deps.filter(d => map[d]).map(d => map[d]);
  }

  private static detectArchitecture(analysis: any): { type: string, summary: string } {
    if (analysis.isMonorepo) {
      return {
        type: 'Monorepo',
        summary: 'A multi-package repository managing distinct apps and shared packages using a build system like Turborepo.'
      };
    }
    return {
      type: 'Monolith',
      summary: 'A single-package modular architecture centered around a core application structure.'
    };
  }

  private static enrichFeatures(analysis: any): string[] {
    const rawFeatures = analysis.features || [];
    const featureMap: Record<string, string> = {
      'Authentication': 'Secure User Authentication & Session Management',
      'API Endpoints': 'RESTful API Interface for external communication',
      'Database Integration': 'Persistent Data Storage with Schema Models',
      'Environment Configuration': 'Robust configuration using environment variables',
      'Real-time': 'Bi-directional real-time communication'
    };
    return rawFeatures.map((f: string) => featureMap[f] || f);
  }

  private static inferRoutePurpose(route: any): string {
    const path = route.path.toLowerCase();
    if (path.includes('auth') || path.includes('login') || path.includes('signup')) return 'Identity & Access Management';
    if (path.includes('user') || path.includes('profile')) return 'User Profile Management';
    if (path.includes('message') || path.includes('chat')) return 'Messaging logic';
    if (path.includes('upload') || path.includes('cloudinary')) return 'Media handling';
    return 'General business logic';
  }

  private static inferFlows(analysis: any): string[] {
    const flows: string[] = [];
    if (analysis.dependencies?.includes('mongoose')) {
      flows.push('Request -> Controller -> Mongoose Model -> MongoDB');
    }
    if (analysis.dependencies?.includes('jsonwebtoken')) {
      flows.push('Client -> JWT Middleware -> Protected Route -> Response');
    }
    if (analysis.tree?.some((f: string) => f.includes('Frontend') || f.includes('web'))) {
      flows.push('Frontend (React) -> Axios -> API Endpoints (Backend)');
    }
    return flows;
  }
}
