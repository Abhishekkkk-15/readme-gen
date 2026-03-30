export interface ReadmeQualityScore {
  score: number; // 0-100
  reasons: string[];
}

function hasSection(md: string, name: string): boolean {
  const re = new RegExp(`^##\\s+${name}\\b`, 'im');
  return re.test(md);
}

/**
 * Lightweight, deterministic quality scorer (no LLM).
 * Use it to guard regressions and drive iterative improvement.
 */
export function evaluateReadmeQuality(readme: string): ReadmeQualityScore {
  const md = readme || '';
  const reasons: string[] = [];
  let score = 0;

  const length = md.trim().length;
  if (length > 2000) score += 15; else reasons.push('README is short (<2k chars).');
  if (length > 6000) score += 10;

  const required = ['Overview', 'Key Features', 'Architecture', 'Tech Stack', 'How It Works'];
  for (const sec of required) {
    if (hasSection(md, sec)) score += 10;
    else reasons.push(`Missing section: ${sec}`);
  }

  if (/```/.test(md)) score += 10; else reasons.push('No code blocks found (examples may be missing).');
  if (/\|.+\|/.test(md)) score += 5; else reasons.push('No tables found (tech stack table is recommended).');
  if (/https?:\/\//.test(md)) score += 5;

  // Penalize obvious placeholders/fluff
  const bad = [/coming soon/i, /\bTODO\b/i, /\blorem ipsum\b/i, /replace with/i, /\bTBD\b/i];
  for (const re of bad) {
    if (re.test(md)) {
      score -= 10;
      reasons.push(`Contains placeholder/fluff: ${re}`);
    }
  }

  score = Math.max(0, Math.min(100, score));
  if (reasons.length === 0) reasons.push('Looks structurally strong.');
  return { score, reasons };
}

