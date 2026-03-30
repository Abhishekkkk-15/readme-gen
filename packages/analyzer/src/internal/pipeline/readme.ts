import { LlmClient } from '../llm/llmClient';
import { ReadmeGenerationInput } from './types';

function buildSectionRules(sections?: string[]): string {
  if (!sections || sections.length === 0) return 'You may include standard README sections as appropriate, but do not add fluff.';
  return `You MUST include ONLY these sections (and omit all others): ${sections.map(s => `"${s}"`).join(', ')}.`;
}

export async function generateReadmeFromSemanticJson(
  llm: LlmClient,
  input: ReadmeGenerationInput
): Promise<string> {
  const { finalProject, additionalContext, heroImageUrl, tone, sections, projectName, projectDescription } = input;

  const headerLines: string[] = [`# ${projectName}`, ''];
  if (projectDescription && projectDescription.trim()) headerLines.push(`> ${projectDescription.trim()}`, '');
  if (heroImageUrl && heroImageUrl.trim()) headerLines.push(`![${projectName} hero](${heroImageUrl.trim()})`, '');

  const prompt = [
    'You are a senior engineer writing a production-grade README.',
    '',
    'CRITICAL: You MUST write the README ONLY from the semantic JSON below.',
    'You are NOT allowed to assume anything outside this JSON and additional context.',
    '',
    '## SEMANTIC PROJECT JSON (authoritative)',
    JSON.stringify(finalProject, null, 2),
    '',
    '## ADDITIONAL CONTEXT (business "why")',
    additionalContext?.trim() ? additionalContext.trim() : 'None provided.',
    '',
    '## OUTPUT',
    'Return README markdown WITHOUT the top-level title (I will add it). Start directly with the first section (e.g. "## Overview").',
    '',
    '## PROMPT RULES',
    `- Tone: ${tone || 'professional'} (deterministic, low temperature).`,
    `- ${buildSectionRules(sections)}`,
    '- No generic fluff. Every sentence must map back to the JSON or additional context.',
    '- Setup: only include if scripts/envVars/entryPoints exist in facts.',
    '- Include Tech Stack as a table with roles.',
    '- Include API endpoints only if facts.routes is non-empty.',
    '- Include Environment Variables only if facts.envVars is non-empty.',
  ].join('\n');

  const body = await llm.generateText(prompt);
  return `${headerLines.join('\n')}\n${body.trim()}\n`;
}

