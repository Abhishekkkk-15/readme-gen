export class DevOpsAnalyzer {
  public static analyze(files: Record<string, string>) {
    const devOps: any = {};

    // 1. Dockerfile
    const dockerPath = Object.keys(files).find(f => f.toLowerCase().endsWith('dockerfile'));
    if (dockerPath) {
      const content = files[dockerPath];
      devOps.docker = {
        baseImage: content.match(/FROM\s+([^\s\n]+)/i)?.[1],
        ports: [...content.matchAll(/EXPOSE\s+(\d+)/gi)].map(m => m[1]),
        command: content.match(/CMD\s+\[?([^\]\n]+)\]?/i)?.[1]?.replace(/"/g, '')
      };
    }

    // 2. Docker Compose
    const composePath = Object.keys(files).find(f => f.toLowerCase().includes('docker-compose') && f.endsWith('.yml'));
    if (composePath) {
      const content = files[composePath];
      const services = [...content.matchAll(/^\s+([a-z0-9_-]+):/gm)]
        .map(m => m[1])
        .filter(s => !['services', 'networks', 'volumes', 'version'].includes(s));
      const networks = [...content.matchAll(/^\s+networks:\s*\n(\s+- [a-z0-9_-]+\n)+/gi)].length > 0 ? ['Enabled'] : [];
      
      devOps.compose = { services, networks };
    }

    // 3. GitHub Actions
    const workflowPath = Object.keys(files).find(f => f.includes('.github/workflows') && f.endsWith('.yml'));
    if (workflowPath) {
      const content = files[workflowPath];
      const jobs = [...content.matchAll(/^\s+([a-z0-9_-]+):/gm)]
        .map(m => m[1])
        .filter(j => !['jobs', 'on', 'workflow_dispatch', 'name'].includes(j));
      
      devOps.pipeline = {
        provider: 'GitHub Actions',
        jobs
      };
    }

    return Object.keys(devOps).length > 0 ? devOps : undefined;
  }
}
