export interface ExtractedData {
  packageMetadata: any;
  structure: any;
  techStack: any;
  api: { endpoints: any[]; totalCount: number };
  configuration: { envVars: any[]; configFiles: string[] };
  codeSamples: any[];
  dbSchemas?: any[];
  examples?: any[];
  devOps?: any;
}

export class ContextFormatter {
  public static formatForLLM(data: ExtractedData) {
    const { packageMetadata, structure, techStack, api, configuration, codeSamples } = data;

    return {
      "PROJECT_MANIFESTO": {
        "identity": {
          "name": packageMetadata?.name || 'Unknown Project',
          "version": packageMetadata?.version || '1.0.0',
          "description": packageMetadata?.description || 'No description provided.',
          "framework": packageMetadata?.frameworks?.[0] || 'Generic Node.js',
          "language": this.detectLanguage(structure)
        },
        "technical_stack": {
          "runtime": "Node.js",
          "package_manager": packageMetadata?.packageManager || 'npm',
          "dependencies_prod": packageMetadata?.dependencies?.production || [],
          "dependencies_dev": packageMetadata?.dependencies?.development || [],
          "inferred_tech": techStack
        },
        "file_system_hierarchy": {
          "entry_points": structure.entryPoints,
          "key_directories": structure.keyDirectories,
          "full_tree_snapshot": structure.tree?.slice(0, 150) // High-density look at the structure
        },
        "api_surface": {
          "detected_routes": api.endpoints,
          "configuration_keys": configuration.envVars
        },
        "database_architecture": data.dbSchemas || [],
        "usage_examples": data.examples || [],
        "infrastructure_devops": data.devOps || {},
        "codebase_evidence_ast": codeSamples.map(sample => ({
          "file_path": sample.filePath,
          "signatures": sample.signatures || []
        }))
      }
    };
  }

  private static detectLanguage(structure: any): string {
    const files = (structure.importantFiles || []).join(' ') + (structure.tree || []).join(' ');
    if (files.includes('.ts')) return 'TypeScript';
    if (files.includes('.js')) return 'JavaScript';
    return 'JavaScript/Node.js';
  }
}
