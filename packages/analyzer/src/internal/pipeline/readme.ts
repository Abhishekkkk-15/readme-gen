import { LlmClient } from '../llm/llmClient';
import { getPersonaGuidance } from './persona';
import { ReadmeGenerationInput } from './types';

function buildSectionRules(sections?: string[]): string {
  if (!sections || sections.length === 0) return 'You may include standard README sections as appropriate, but do not add fluff.';
  return `You MUST include ONLY these sections (and omit all others): ${sections.map(s => `"${s}"`).join(', ')}.`;
}

export async function generateReadmeFromSemanticJson(
  llm: LlmClient,
  input: ReadmeGenerationInput
): Promise<string> {
  const {
    finalProject,
    scriptsMarkdown,
    additionalContext,
    heroImageUrl,
    tone,
    persona,
    sections,
    projectName,
    projectDescription,
  } = input;
  const personaLabel = persona?.trim() || 'Senior Developer';
  const personaRules = getPersonaGuidance(personaLabel);

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
    '## PACKAGE SCRIPTS (copy into Usage — commands are already correct for this repo)',
    scriptsMarkdown?.trim() || 'None provided in source metadata.',
    '',
    '## OUTPUT',
    'Return README markdown WITHOUT the top-level title (I will add it). Start directly with the first section (e.g. "## Overview").',
    '',
    '## PROMPT RULES',
    `- Tone: ${tone || 'professional'} (deterministic, low temperature).`,
    `- Persona (${personaLabel}): ${personaRules}`,
    `- ${buildSectionRules(sections)}`,
    '- No generic fluff. Every sentence must map back to the JSON or additional context.',
    '- Setup: only include if scripts/envVars/entryPoints exist in facts.',
    '- **Scripts**: If PACKAGE SCRIPTS section above is non-empty, include it (or a clean subset) as a markdown table in Usage/Getting started — preserve the **Run** commands exactly; do not replace pnpm with npm unless the table says npm.',
    '- Include Tech Stack as a table with roles.',
    '- Include API endpoints only if facts.routes is non-empty.',
    '- Include Environment Variables only if facts.envVars is non-empty.',
  ].join('\n');

  const body = await llm.generateText(prompt);
  return `${headerLines.join('\n')}\n${body.trim()}\n`;
}

