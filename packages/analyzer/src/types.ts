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

  astFeatures: {
    name: string;
    evidence: {
      snippet: string;
      file: string;
    }[];
  }[];

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
