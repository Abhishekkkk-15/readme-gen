import { ProjectAnalysis, ProjectContext, ProjectSummary } from '../../types';
import { buildScriptsMarkdown } from '../../utils/scriptsMarkdown';

export interface EvidenceBlock {
  title: string;
  text: string;
}

function mdCodeBlock(lang: string, content: string): string {
  const safe = content.trim();
  return `\`\`\`${lang}\n${safe}\n\`\`\``;
}

function renderRoutes(summary: ProjectSummary): EvidenceBlock | null {
  const routes = summary.routes || [];
  if (routes.length === 0) return null;

  const header = '| Method | Endpoint | Source File |\n|--------|----------|-------------|';
  const rows = routes.map(r => `| ${r.method.toUpperCase()} | \`${r.path}\` | \`${r.file}\` |`);
  const snippets = routes
    .filter(r => Boolean(r.snippet))
    .slice(0, 10)
    .map(r => `### ${r.method.toUpperCase()} \`${r.path}\`\nSource: \`${r.file}\`\n\n${mdCodeBlock('ts', String(r.snippet).slice(0, 1200))}`)
    .join('\n\n');

  return {
    title: 'API Routes',
    text: [
      '## API ROUTES',
      header,
      ...rows,
      snippets ? `\n## ROUTE HANDLER SNIPPETS (verbatim)\n${snippets}` : '',
    ].filter(Boolean).join('\n'),
  };
}

function renderEnv(summary: ProjectSummary): EvidenceBlock | null {
  const env = summary.envVars || [];
  if (env.length === 0) return null;
  return {
    title: 'Environment Variables',
    text: `## ENVIRONMENT VARIABLES\n${mdCodeBlock('env', env.map(v => `${v}=`).join('\n'))}`,
  };
}

function renderScripts(summary: ProjectSummary): EvidenceBlock | null {
  const md = buildScriptsMarkdown(summary);
  if (!md) return null;
  return {
    title: 'Scripts',
    text: `## PACKAGE SCRIPTS\n${md}`,
  };
}

function renderTechClues(summary: ProjectSummary): EvidenceBlock {
  const deps = (summary.dependencies || []).filter(d => !d.startsWith('@types/')).slice(0, 40);
  const devDeps = (summary.devDependencies || []).filter(d => !d.startsWith('@types/')).slice(0, 40);
  const frameworks = summary.framework?.evidence || [];
  const parts = [
    `Project: **${summary.name}**`,
    summary.description ? `Description: ${summary.description}` : '',
    summary.language ? `Language: ${summary.language}` : '',
    summary.framework?.name ? `Framework guess: ${summary.framework.name} (confidence ${summary.framework.confidence})` : '',
    frameworks.length ? `Framework evidence: ${frameworks.join(', ')}` : '',
    deps.length ? `Dependencies: ${deps.join(', ')}` : '',
    devDeps.length ? `DevDependencies: ${devDeps.join(', ')}` : '',
    summary.isMonorepo ? `Monorepo: yes` : 'Monorepo: no/unknown',
    summary.hasDocker ? `Docker: yes` : 'Docker: no/unknown',
    (summary.entryPoints || []).length ? `Entry points: ${(summary.entryPoints || []).slice(0, 20).map(e => `\`${e}\``).join(', ')}` : '',
  ].filter(Boolean);

  return {
    title: 'Tech Clues',
    text: `## TECH CLUES (grounding)\n${parts.map(p => `- ${p}`).join('\n')}`,
  };
}

function renderCodeSurface(context: ProjectContext): EvidenceBlock | null {
  const files = context?.evidence?.files || [];
  if (files.length === 0) return null;

  // Keep this smaller; chunker will split across files anyway.
  const rendered = files.slice(0, 60).map(f => {
    const snippets = (f.snippets || []).slice(0, 60).map(s => `- ${String(s).slice(0, 500)}`).join('\n');
    return `## FILE: ${f.path}\n${snippets || '_No extracted signatures_'}\n`;
  }).join('\n');

  return {
    title: 'Code Surface',
    text: `# CODE SURFACE (verbatim signatures)\n${rendered}`.trim(),
  };
}

function renderExamples(summary: ProjectSummary): EvidenceBlock | null {
  const examples = summary.examples || [];
  if (examples.length === 0) return null;
  const rendered = examples.slice(0, 10).map(ex => {
    const code = String(ex.code || '').trim().slice(0, 1600);
    return `### ${ex.description}\nSource: \`${ex.file}\`\n\n${mdCodeBlock('ts', code)}`;
  }).join('\n\n');
  return {
    title: 'Examples',
    text: `## REAL EXAMPLES (from tests)\n${rendered}`,
  };
}

function renderExistingReadme(summary: ProjectSummary): EvidenceBlock | null {
  const existing = summary.existingReadme?.content?.trim();
  if (!existing) return null;
  return {
    title: 'Existing README',
    text: [
      '## EXISTING README',
      `Path: ${summary.existingReadme?.path}`,
      'Treat this as prior repository knowledge: preserve accurate product framing, workflows, and terminology, but prefer code evidence when facts conflict.',
      mdCodeBlock('md', existing.slice(0, 12000)),
    ].join('\n'),
  };
}

export interface ExtractionEvidence {
  blocks: EvidenceBlock[];
  /**
   * Flattened string blocks ready for chunking.
   */
  textBlocks: string[];
}

/**
 * Build an evidence layer for semantic understanding.
 * This is the only thing the LLM sees in stages 1-3 (plus rules).
 */
export function buildSemanticEvidence(analysis: ProjectAnalysis): ExtractionEvidence {
  const { summary, context } = analysis;

  const blocks: (EvidenceBlock | null)[] = [
    renderTechClues(summary),
    renderExistingReadme(summary),
    renderScripts(summary),
    renderEnv(summary),
    renderRoutes(summary),
    renderExamples(summary),
    renderCodeSurface(context),
  ];

  const finalBlocks = blocks.filter(Boolean) as EvidenceBlock[];
  return {
    blocks: finalBlocks,
    textBlocks: finalBlocks.map(b => b.text),
  };
}

