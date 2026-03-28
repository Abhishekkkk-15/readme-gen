export interface ExtractedData {
  packageMetadata: any;
  structure: any;
  techStack: any;
  api: { endpoints: any[]; totalCount: number };
  configuration: { envVars: any[]; configFiles: string[] };
  codeSamples: any[];
}

export class ContextFormatter {
  public static formatForLLM(data: ExtractedData) {
    const { packageMetadata, structure, techStack, api, configuration, codeSamples } = data;

    return {
      projectOverview: {
        name: packageMetadata?.name || 'Unknown Project',
        type: packageMetadata?.frameworks?.[0] || 'Generic',
        language: this.detectLanguage(packageMetadata, structure),
        framework: packageMetadata?.frameworks?.[0] || 'N/A',
        frameworks: packageMetadata?.frameworks || [],
        packageManager: packageMetadata?.packageManager || 'npm'
      },
      structure: {
        entryPoints: structure.entryPoints,
        keyDirectories: structure.keyDirectories,
        importantFiles: structure.importantFiles,
        tree: structure.tree
      },
      techStack: {
        core: techStack.core,
        database: techStack.database,
        testing: techStack.testing,
        deployment: techStack.deployment
      },
      scripts: {
        available: Object.keys(packageMetadata?.scripts || {}),
        actualCommands: packageMetadata?.scripts || {}
      },
      api: {
        endpoints: api.endpoints,
        totalCount: api.totalCount
      },
      configuration: {
        envVars: configuration.envVars,
        configFiles: configuration.configFiles
      },
      dependencies: {
        production: packageMetadata?.dependencies?.production || [],
        development: packageMetadata?.dependencies?.development || [],
        peer: packageMetadata?.dependencies?.peer || []
      },
      metadata: {
        version: packageMetadata?.version || '1.0.0',
        author: packageMetadata?.author || 'Auto-generated',
        license: packageMetadata?.license || 'MIT',
        repository: packageMetadata?.repository || ''
      },
      codeInsights: codeSamples.map(sample => ({
        file: sample.filePath,
        exports: sample.exports,
        signatures: sample.signatures,
        docstrings: sample.docstrings
      }))
    };
  }

  private static detectLanguage(pkg: any, structure: any): string {
    const files = structure.importantFiles.join(' ');
    if (files.includes('.ts')) return 'TypeScript';
    if (files.includes('.js')) return 'JavaScript';
    if (files.includes('.py')) return 'Python';
    if (files.includes('.go')) return 'Go';
    if (files.includes('.rs')) return 'Rust';
    return 'Unknown';
  }
}
