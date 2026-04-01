import { ProjectAnalysis } from '../../types';
import { chunkEvidenceBlocks } from '../analysis/chunker';
import { buildSemanticEvidence } from '../analysis/evidence';
import { detectTechStack } from '../analysis/techStack';
import { LlmClient, LlmClientOptions } from '../llm/llmClient';
import { analyzeArchitecture, analyzeProjectIntent, extractFeatures } from './stages';
import { mergeProjectUnderstanding } from './merge';
import { generateReadmeFromSemanticJson } from './readme';
import { ExtractedFacts, FinalProjectJSON, ReadmeGenerationInput } from './types';
import { buildScriptsMarkdown } from '../../utils/scriptsMarkdown';

export interface PipelineOptions {
  llm: Omit<LlmClientOptions, 'temperature'> & { temperature?: number };
  /**
   * Evidence chunking config.
   */
  maxCharsPerChunk?: number;
  /**
   * Optional business context.
   */
  additionalContext?: string;
  /**
   * Optional hero image URL to embed near top.
   */
  heroImageUrl?: string;
  /**
   * Tone control for README (semantic JSON remains factual).
   */
  tone?: string;
  /**
   * Author persona / voice (matches web app).
   */
  persona?: string;
  /**
   * If provided, generator must include ONLY these sections.
   */
  sections?: string[];
}

export interface PipelineResult {
  finalProject: FinalProjectJSON;
  readme: string;
  evidenceChunks: { id: string; approxTokens: number }[];
}

function collectImportHints(analysis: ProjectAnalysis): string[] {
  const files = analysis.context?.evidence?.files || [];
  // DefinitionExtractor includes import lines like `Import: { X } from "pkg"`
  const hints: string[] = [];
  for (const f of files) {
    for (const s of f.snippets || []) {
      if (String(s).startsWith('Import')) hints.push(String(s));
    }
  }
  // Add deps as hints too
  const deps = (analysis.summary.dependencies || []).concat(analysis.summary.devDependencies || []);
  for (const d of deps) hints.push(`dep:${d}`);
  return hints;
}

function buildFacts(analysis: ProjectAnalysis): ExtractedFacts {
  const summary = analysis.summary;
  return {
    routes: (summary.routes || []).map(r => ({ method: r.method, path: r.path, file: r.file })),
    envVars: summary.envVars || [],
    scripts: summary.scripts || {},
    entryPoints: summary.entryPoints || [],
    framework: summary.framework ? { name: summary.framework.name, confidence: summary.framework.confidence } : undefined,
    isMonorepo: summary.isMonorepo,
    hasDocker: summary.hasDocker,
  };
}

/**
 * Production-grade semantic README pipeline (no direct README from raw code).
 *
 * Stages:
 * - Code Extraction Layer (already done upstream via analyzers)
 * - Intent (LLM #1)
 * - Features (LLM #2)
 * - Architecture (LLM #3)
 * - Tech stack (heuristic)
 * - Semantic merge (LLM #4)
 * - README generation from FinalProjectJSON only (LLM #5)
 */
export async function runSemanticReadmePipeline(
  analysis: ProjectAnalysis,
  options: PipelineOptions
): Promise<PipelineResult> {
  const llm = new LlmClient({
    ...options.llm,
    temperature: options.llm.temperature ?? 0.1,
  });

  const evidence = buildSemanticEvidence(analysis);
  const chunks = chunkEvidenceBlocks(evidence.textBlocks, {
    maxCharsPerChunk: options.maxCharsPerChunk ?? 24_000,
    chunkHeader: `Project: ${analysis.summary.name}`,
  });

  const chunkTexts = chunks.map(c => c.text);

  // Safe parallelism: intent/features/architecture are independent (LLM #1-3).
  const [intent, features, architecture] = await Promise.all([
    analyzeProjectIntent(llm, chunkTexts),
    extractFeatures(llm, chunkTexts),
    analyzeArchitecture(llm, chunkTexts),
  ]);

  const importHints = collectImportHints(analysis);
  const techStack = detectTechStack(importHints);
  const facts = buildFacts(analysis);

  const finalProject = await mergeProjectUnderstanding(llm, {
    intent,
    features,
    architecture,
    techStack,
    facts,
  });

  const scriptsMd = buildScriptsMarkdown(analysis.summary);

  const readmeInput: ReadmeGenerationInput = {
    finalProject,
    scriptsMarkdown: scriptsMd ?? undefined,
    additionalContext: options.additionalContext,
    heroImageUrl: options.heroImageUrl,
    tone: options.tone,
    persona: options.persona,
    sections: options.sections,
    projectName: analysis.summary.name,
    projectDescription: analysis.summary.description,
  };

  const readme = await generateReadmeFromSemanticJson(llm, readmeInput);

  return {
    finalProject,
    readme,
    evidenceChunks: chunks.map(c => ({ id: c.id, approxTokens: c.approxTokens })),
  };
}

