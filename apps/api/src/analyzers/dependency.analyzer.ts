interface DependencyGroups {
  core: string[];
  database: string[];
  testing: string[];
  deployment: string[];
}

export class DependencyAnalyzer {
  private static CORE = ['express', 'fastapi', 'flask', 'django', 'react', 'next', 'vue', 'nest', 'koa'];
  private static DATABASE = ['mongoose', 'prisma', 'pg', 'mysql2', 'redis', 'sequelize', 'mongodb', 'psycopg2', 'sqlalchemy'];
  private static TESTING = ['jest', 'mocha', 'chai', 'cypress', 'pytest', 'vitest', 'playwright'];
  private static DEPLOYMENT = ['docker', 'aws-sdk', 'firebase', 'vercel', 'netlify', 'terraform'];

  public static analyze(dependencies: string[]): DependencyGroups {
    const groups: DependencyGroups = {
      core: [],
      database: [],
      testing: [],
      deployment: []
    };

    dependencies.forEach(dep => {
      const lower = dep.toLowerCase();
      if (this.CORE.some(c => lower.includes(c))) groups.core.push(dep);
      if (this.DATABASE.some(d => lower.includes(d))) groups.database.push(dep);
      if (this.TESTING.some(t => lower.includes(t))) groups.testing.push(dep);
      if (this.DEPLOYMENT.some(d => lower.includes(d))) groups.deployment.push(dep);
    });

    return groups;
  }
}
