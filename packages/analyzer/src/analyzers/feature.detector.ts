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
    'starlette': 'ASGI Python framework',
    'uvicorn': 'ASGI server',
    'gunicorn': 'WSGI HTTP server',
    'celery': 'Distributed task queue',
    'sqlalchemy': 'SQL toolkit / ORM',
    'pydantic': 'Data validation',
    'httpx': 'HTTP client',
    'requests': 'HTTP client',
    'boto3': 'AWS SDK',
    'pytest': 'Python testing',
    'ruff': 'Python linter/formatter',
    'black': 'Python formatter',
    'gin-gonic/gin': 'Gin HTTP framework',
    'labstack/echo': 'Echo web framework',
    'gofiber/fiber': 'Fiber web framework',
    'go-chi/chi': 'chi router',
    'gorilla/mux': 'Gorilla mux router',
    'google.golang.org/grpc': 'gRPC',
    'grpc-go': 'gRPC Go',
    'spf13/cobra': 'Cobra CLI',
    'gorm.io/gorm': 'GORM ORM',
    'testify': 'Go assertions/mocks',
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
