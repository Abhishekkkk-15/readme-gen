import { LlmClient } from '../llm/llmClient';
import { ArchitectureJSON, FeatureJSON, IntentJSON } from './types';

export async function analyzeProjectIntent(llm: LlmClient, chunks: string[]): Promise<IntentJSON> {
  const prompt = [
    'You are analyzing a software project based ONLY on extracted evidence blocks.',
    'Your job: infer the project intent WITHOUT guessing beyond evidence.',
    '',
    '## EVIDENCE CHUNKS',
    chunks.map((c, i) => `### CHUNK ${i + 1}\n${c}`).join('\n\n'),
    '',
    '## TASK',
    'Return the project intent fields. Be specific and grounded in evidence.',
    '',
    '## RULES',
    '- No guessing beyond code evidence.',
    '- If evidence is insufficient for a field, write a conservative answer based on what is present (do not invent).',
    '- Keep purpose to 1-2 sentences.',
  ].join('\n');

  return await llm.generateJson<IntentJSON>(prompt, {
    jsonShapeHint: `{
  "projectType": "API | CLI | SaaS | Library | Fullstack",
  "purpose": "1-2 sentence clear description",
  "targetUsers": "Who this is for",
  "problemSolved": "Core problem"
}`,
  });
}

export async function extractFeatures(llm: LlmClient, chunks: string[]): Promise<FeatureJSON> {
  const prompt = [
    'You are a senior engineer extracting REAL features from a codebase.',
    'Features are user-visible capabilities, NOT function lists.',
    '',
    '## EVIDENCE CHUNKS',
    chunks.map((c, i) => `### CHUNK ${i + 1}\n${c}`).join('\n\n'),
    '',
    '## TASK',
    'Group the project logic into real product features.',
    'Combine related behavior and name the feature clearly.',
    '',
    '## RULES',
    '- Do NOT output generic features like "Uses TypeScript" or "Has API endpoints".',
    '- Every feature must have evidence in routes, extracted signatures, or test examples.',
    '- relatedEndpoints must be real paths found in evidence (otherwise []).',
  ].join('\n');

  return await llm.generateJson<FeatureJSON>(prompt, {
    jsonShapeHint: `{
  "features": [
    {
      "name": "Authentication",
      "description": "Handles login, signup, session",
      "relatedEndpoints": ["/login", "/register"]
    }
  ]
}`,
  });
}

export async function analyzeArchitecture(llm: LlmClient, chunks: string[]): Promise<ArchitectureJSON> {
  const prompt = [
    'You are analyzing the architecture of a project from extracted evidence.',
    '',
    '## EVIDENCE CHUNKS',
    chunks.map((c, i) => `### CHUNK ${i + 1}\n${c}`).join('\n\n'),
    '',
    '## TASK',
    'Infer the architecture pattern and module boundaries based on file structure, routes, and extracted signatures.',
    '',
    '## RULES',
    '- No hallucination: only name modules/services visible from evidence.',
    '- requestFlow should be a concise arrow chain (e.g. Client → Routes → Controllers → Services → DB).',
    '- externalServices must be inferred from deps/imports/evidence (e.g. MongoDB, Redis).',
  ].join('\n');

  return await llm.generateJson<ArchitectureJSON>(prompt, {
    jsonShapeHint: `{
  "architecturePattern": "MVC | Layered | Modular",
  "requestFlow": "Client → Routes → Controllers → Services → DB",
  "modules": [
    { "name": "Auth Module", "responsibility": "Handles user authentication" }
  ],
  "externalServices": ["MongoDB", "Redis", "Socket.IO"]
}`,
  });
}

