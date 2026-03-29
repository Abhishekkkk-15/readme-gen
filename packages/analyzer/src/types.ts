export interface ProjectAnalysis {
  name: string;
  description?: string;
  language: string;
  features: string[];

  framework?: {
    name: string;
    confidence: number;
    evidence: string[];
  };

  scripts?: Record<string, string>;
  dependencies?: string[];
  devDependencies?: string[];

  entryPoints?: string[];

  routes?: {
    method: string;
    path: string;
    file: string;
    snippet?: string;
  }[];

  envVars?: string[];

  hasDocker?: boolean;

  tree?: string[];
  keyDirectories?: string[];
  isMonorepo?: boolean;

  astFeatures: {
    name: string;
    evidence: {
      snippet: string;
      file: string;
    }[];
  }[];

  dbSchemas?: {
    model: string;
    fields: string[];
    file: string;
  }[];

  examples?: {
    description: string;
    code: string;
    file: string;
  }[];

  devOps?: {
    docker?: {
      baseImage?: string;
      ports?: string[];
      command?: string;
    };
    compose?: {
      services: string[];
      networks: string[];
    };
    pipeline?: {
      provider: string; // e.g. "GitHub Actions"
      jobs: string[];
    };
  };

  evidence: {
    files: {
      path: string;
      snippets: string[];
    }[];
  };
}


export interface AnalysisInput {
  files: Record<string, string>; // path -> content
  allFilePaths: string[];
  gitignoreContent?: string;
}
