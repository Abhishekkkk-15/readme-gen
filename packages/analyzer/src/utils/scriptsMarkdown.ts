import type { ProjectSummary } from '../types';

/** Inline code content: escape backticks so markdown stays valid */
function escapeInlineCode(s: string): string {
  return String(s).replace(/`/g, '\\`');
}

function packageManagerRun(pm: string | undefined): { label: string; runWord: string } {
  const p = (pm || 'npm').toLowerCase();
  if (p === 'pnpm') return { label: 'pnpm', runWord: 'pnpm run' };
  if (p === 'yarn') return { label: 'yarn', runWord: 'yarn' };
  if (p === 'bun') return { label: 'bun', runWord: 'bun run' };
  return { label: 'npm', runWord: 'npm run' };
}

/**
 * Workspace script keys from PackageParser: "apps/api:dev" → dir apps/api, script dev.
 * Plain keys: "build", "test" (no colon, or colon without path segments).
 */
function parseScriptKey(key: string): { workspaceDir: string | null; scriptName: string } {
  const i = key.indexOf(':');
  if (i <= 0) return { workspaceDir: null, scriptName: key };
  const maybePath = key.slice(0, i);
  const scriptName = key.slice(i + 1);
  if (maybePath.includes('/') || maybePath.startsWith('packages\\') || maybePath.includes('\\')) {
    const normalized = maybePath.replace(/\\/g, '/');
    return { workspaceDir: normalized, scriptName };
  }
  // e.g. "npm:publish" — treat as single script name with colon
  return { workspaceDir: null, scriptName: key };
}

function howToRun(
  pm: string | undefined,
  scriptKey: string,
  rawValue: string,
): { command: string; notes?: string } {
  const { runWord } = packageManagerRun(pm);
  const { workspaceDir, scriptName } = parseScriptKey(scriptKey);
  const value = rawValue.trim();

  if (workspaceDir) {
    const cmd = `cd ${workspaceDir} && ${runWord} ${scriptName}`;
    return {
      command: cmd,
      notes: value.startsWith('turbo ') ? 'turbo task' : undefined,
    };
  }

  return { command: `${runWord} ${scriptName}` };
}

/**
 * Markdown block for README / evidence: table + package manager line.
 */
export function buildScriptsMarkdown(summary: ProjectSummary): string | null {
  const scripts = summary.scripts || {};
  const entries = Object.entries(scripts);
  if (entries.length === 0) return null;

  const { label } = packageManagerRun(summary.packageManager);

  const lines: string[] = [
    `_Detected package manager: **${label}**._`,
    '',
    '| Script | Definition | Run (from repo root) |',
    '| --- | --- | --- |',
  ];

  for (const [key, rawVal] of entries) {
    const def = escapeInlineCode(String(rawVal));
    const { command, notes } = howToRun(summary.packageManager, key, String(rawVal));
    const runCol = notes ? `\`${escapeInlineCode(command)}\` _(${notes})_` : `\`${escapeInlineCode(command)}\``;
    lines.push(`| \`${escapeInlineCode(key)}\` | \`${def}\` | ${runCol} |`);
  }

  return lines.join('\n');
}

/**
 * Compact one-liner list for nested README prompts (per workspace).
 */
export function formatWorkspaceScriptsForPrompt(
  scripts: Record<string, string>,
  workspaceDir: string,
  packageManager?: string,
): string {
  const { runWord } = packageManagerRun(packageManager);
  const rows = Object.entries(scripts).map(([name, val]) => {
    const cmd = `cd ${workspaceDir} && ${runWord} ${name}`;
    return `- **${name}**: \`${escapeInlineCode(String(val))}\` → \`${escapeInlineCode(cmd)}\``;
  });
  return rows.join('\n');
}
