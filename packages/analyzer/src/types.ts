export interface ProjectSummary {
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
  /** Detected from lockfile during package analysis (npm | pnpm | yarn). */
  packageManager?: string;
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
  isMonorepo?: boolean;

  tree?: string[];
  keyDirectories?: string[];

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
}

export interface ProjectContext {
  evidence: {
    files: {
      path: string;
      snippets: string[];
    }[];
  };
}

export interface ProjectAnalysis {
  summary: ProjectSummary;
  context: ProjectContext;
}


export interface AnalysisInput {
  files: Record<string, string>; // path -> content
  allFilePaths: string[];
  gitignoreContent?: string;
}
