export class FeatureDetector {
  private static FEATURE_MAP: Record<string, string> = {
    'express': 'REST API Framework',
    'fastify': 'High-performance REST API',
    'react': 'Frontend Development',
    'next': 'Server-side Rendering',
    'mongoose': 'MongoDB Database Support',
    'prisma': 'Modern Database ORM',
    'jest': 'Automated Unit Testing',
    'cypress': 'End-to-End Testing',
    'docker': 'Containerization Support',
    'passport': 'Authentication & Authorization',
    'jsonwebtoken': 'JWT Auth Tokens',
    'axios': 'External API Integration',
    'dotenv': 'Environment Configuration',
    'typescript': 'Static Type Safety',
    'turbo': 'Monorepo Pipeline Management',
    'stripe': 'Payment Processing',
    'redis': 'Cache & Session Management',
    'socket.io': 'Real-time Communication',
    'nest': 'Enterprise-grade Architecture',
    'fastapi': 'High-performance Python API',
    'flask': 'Lightweight Python Web Services',
    'django': 'Full-stack Python Framework',
  };

  public static detect(dependencies: string[], devDependencies: string[], hasDocker: boolean, hasRoutes: boolean): string[] {
    const features = new Set<string>();
    const allDeps = [...dependencies, ...devDependencies].map(d => d.toLowerCase());

    for (const [dep, feature] of Object.entries(this.FEATURE_MAP)) {
      if (allDeps.some(d => d.includes(dep))) {
        features.add(feature);
      }
    }

    if (hasDocker) features.add('Docker Container Environments');
    if (hasRoutes) features.add('API Endpoint Management');
    if (dependencies.length > 0) features.add('Dependency-driven development');

    return Array.from(features);
  }
}
