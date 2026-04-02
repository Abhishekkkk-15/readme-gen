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
    existingReadme,
    writeMode,
    projectName,
    projectDescription,
  } = input;
  const personaLabel = persona?.trim() || 'Senior Developer';
  const personaRules = getPersonaGuidance(personaLabel);
  const mode = writeMode || (existingReadme?.content?.trim() ? 'rewrite' : 'overwrite');

  const headerLines: string[] = [`# ${projectName}`, ''];
  if (projectDescription && projectDescription.trim()) headerLines.push(`> ${projectDescription.trim()}`, '');
  if (heroImageUrl && heroImageUrl.trim()) headerLines.push(`![${projectName} hero](${heroImageUrl.trim()})`, '');
  const existingReadmeBlock = existingReadme?.content?.trim()
    ? [
        '## EXISTING README',
        `Path: ${existingReadme.path}`,
        'Use this as grounded source material when mode is not "overwrite".',
        '```md',
        existingReadme.content.trim().slice(0, 12000),
        '```',
        '',
      ].join('\n')
    : '';
  const outputRule =
    mode === 'append'
      ? 'Return ONLY the new markdown to append to the existing README. Do not repeat the current title, overview, badges, or sections that already exist unless you are expanding them with net-new grounded information. Start with a `##` heading.'
      : 'Return the complete README markdown WITHOUT the top-level title (I will add it). Start directly with the first section (e.g. "## Overview").';
  const readmeHandlingRule =
    mode === 'overwrite'
      ? '- Ignore any existing README prose unless it appears in the semantic JSON or additional context.'
      : mode === 'append'
        ? '- Existing README handling: append-only mode. Use the EXISTING README block to avoid duplication and generate only net-new, grounded sections or expansions.'
        : '- Existing README handling: rewrite mode. Preserve accurate structure, examples, and wording from the EXISTING README where useful, but fix stale or generic content using the semantic JSON.';

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
    existingReadmeBlock,
    '## PACKAGE SCRIPTS (copy into Usage - commands are already correct for this repo)',
    scriptsMarkdown?.trim() || 'None provided in source metadata.',
    '',
    '## OUTPUT',
    outputRule,
    '',
    '## PROMPT RULES',
    `- Tone: ${tone || 'professional'} (deterministic, low temperature).`,
    `- Persona (${personaLabel}): ${personaRules}`,
    `- ${buildSectionRules(sections)}`,
    `- Existing README mode: ${mode}.`,
    readmeHandlingRule,
    '- No generic fluff. Every sentence must map back to the JSON or additional context.',
    '- Setup: only include if scripts/envVars/entryPoints exist in facts.',
    '- **Scripts**: If PACKAGE SCRIPTS section above is non-empty, include it (or a clean subset) as a markdown table in Usage/Getting started - preserve the **Run** commands exactly; do not replace pnpm with npm unless the table says npm.',
    '- Include Tech Stack as a table with roles.',
    '- Include API endpoints only if facts.routes is non-empty.',
    '- Include Environment Variables only if facts.envVars is non-empty.',
  ].join('\n');

  const body = await llm.generateText(prompt);
  if (mode === 'append') {
    const existingContent = existingReadme?.content?.trim();
    const appended = body.trim();
    if (!existingContent) return `${headerLines.join('\n')}\n${appended}\n`;
    return `${existingContent}\n\n${appended}\n`;
  }
  return `${headerLines.join('\n')}\n${body.trim()}\n`;
}

