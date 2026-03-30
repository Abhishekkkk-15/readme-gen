import { LlmClient } from '../llm/llmClient';
import { ArchitectureJSON, ExtractedFacts, FeatureJSON, FinalProjectJSON, IntentJSON, TechStackItem } from './types';

export interface PartialUnderstanding {
  intent: IntentJSON;
  features: FeatureJSON;
  architecture: ArchitectureJSON;
  techStack: TechStackItem[];
  facts: ExtractedFacts;
}

/**
 * LLM Call #4: merge and dedupe all semantic outputs.
 * We keep this strict: no new claims beyond the provided partial data.
 */
export async function mergeProjectUnderstanding(llm: LlmClient, partial: PartialUnderstanding): Promise<FinalProjectJSON> {
  const prompt = [
    'You are merging multiple semantic analyses of the SAME project into one canonical JSON.',
    'You MUST NOT invent new features/endpoints/services. Only consolidate and remove duplicates.',
    '',
    '## INPUT (authoritative)',
    JSON.stringify(partial, null, 2),
    '',
    '## TASK',
    '- Merge duplicate features/modules.',
    '- Normalize naming (consistent casing).',
    '- Resolve conflicts conservatively (prefer what is directly in facts/routes).',
    '- Ensure relatedEndpoints are real and deduped.',
    '',
    '## RULES',
    '- No hallucination. Do not add fields not in the schema.',
    '- If something is uncertain, keep it out (or lower confidence) rather than inventing.',
  ].join('\n');

  return await llm.generateJson<FinalProjectJSON>(prompt, {
    jsonShapeHint: `{
  "intent": {
    "projectType": "API | CLI | SaaS | Library | Fullstack",
    "purpose": "string",
    "targetUsers": "string",
    "problemSolved": "string"
  },
  "features": { "features": [ { "name": "string", "description": "string", "relatedEndpoints": ["string"] } ] },
  "architecture": {
    "architecturePattern": "MVC | Layered | Modular",
    "requestFlow": "string",
    "modules": [ { "name": "string", "responsibility": "string" } ],
    "externalServices": ["string"]
  },
  "techStack": [ { "name": "string", "role": "string", "confidence": 0.0, "evidence": ["string"] } ],
  "facts": {
    "routes": [ { "method": "string", "path": "string", "file": "string" } ],
    "envVars": ["string"],
    "scripts": { "key": "value" },
    "entryPoints": ["string"],
    "framework": { "name": "string", "confidence": 0.0 },
    "isMonorepo": true,
    "hasDocker": true
  }
}`,
  });
}

