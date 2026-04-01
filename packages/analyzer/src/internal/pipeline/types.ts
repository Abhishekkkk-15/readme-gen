export type ProjectType = 'API' | 'CLI' | 'SaaS' | 'Library' | 'Fullstack';

export interface IntentJSON {
  projectType: ProjectType;
  purpose: string;
  targetUsers: string;
  problemSolved: string;
}

export interface FeatureItem {
  name: string;
  description: string;
  relatedEndpoints: string[];
}

export interface FeatureJSON {
  features: FeatureItem[];
}

export type ArchitecturePattern = 'MVC' | 'Layered' | 'Modular';

export interface ArchitectureModule {
  name: string;
  responsibility: string;
}

export interface ArchitectureJSON {
  architecturePattern: ArchitecturePattern;
  requestFlow: string;
  modules: ArchitectureModule[];
  externalServices: string[];
}

export interface TechStackItem {
  name: string;
  role: string;
  confidence?: number;
  evidence?: string[];
}

export interface ExtractedFacts {
  routes: { method: string; path: string; file: string }[];
  envVars: string[];
  scripts: Record<string, string>;
  entryPoints: string[];
  framework?: { name: string; confidence: number };
  isMonorepo?: boolean;
  hasDocker?: boolean;
}

export interface FinalProjectJSON {
  intent: IntentJSON;
  features: FeatureJSON;
  architecture: ArchitectureJSON;
  techStack: TechStackItem[];
  facts: ExtractedFacts;
}

export interface ReadmeGenerationInput {
  finalProject: FinalProjectJSON;
  /**
   * Pre-rendered scripts table (npm/pnpm/yarn + monorepo paths). Preferred over facts.scripts for Usage section.
   */
  scriptsMarkdown?: string;
  /**
   * Optional extra business context. This is not code; it is user-supplied grounding.
   */
  additionalContext?: string;
  /**
   * Optional hero image URL to embed near top.
   */
  heroImageUrl?: string;
  /**
   * Tone control.
   */
  tone?: string;
  /**
   * Author voice (Senior Developer, Startup Founder, etc.) — same as web app.
   */
  persona?: string;
  /**
   * Explicit sections toggle (if provided, generator must omit others).
   */
  sections?: string[];
  /**
   * Project name (from package metadata).
   */
  projectName: string;
  projectDescription?: string;
}

