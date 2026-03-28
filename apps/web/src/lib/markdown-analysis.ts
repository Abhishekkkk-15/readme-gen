export type InsightSeverity = 'info' | 'warning' | 'error'

export interface MarkdownInsight {
  id: string
  severity: InsightSeverity
  category: 'secret' | 'a11y' | 'i18n'
  message: string
  line?: number
  fix?: { label: string; action: (md: string) => string }
}

const SECRET_PATTERNS: { id: string; re: RegExp; message: string; replacement?: string }[] = [
  { id: 'openai', re: /\bsk-[a-zA-Z0-9]{20,}\b/g, message: 'Possible OpenAI-style API key', replacement: '<OPENAI_API_KEY>' },
  { id: 'anthropic', re: /\bsk-ant-[a-zA-Z0-9_-]{10,}\b/g, message: 'Possible Anthropic API key', replacement: '<ANTHROPIC_API_KEY>' },
  { id: 'aws', re: /\bAKIA[0-9A-Z]{16}\b/g, message: 'Possible AWS access key id', replacement: '<AWS_ACCESS_KEY_ID>' },
  { id: 'ghpat', re: /\bghp_[a-zA-Z0-9]{20,}\b/g, message: 'Possible GitHub personal access token', replacement: '<GITHUB_PAT>' },
  { id: 'generic', re: /\b(api[_-]?key|secret|password)\s*[:=]\s*['"]?[^\s'"]{8,}/gi, message: 'Possible credential in key/value form' },
]

export function scanMarkdownSecrets(md: string): MarkdownInsight[] {
  const out: MarkdownInsight[] = []
  const lines = md.split('\n')
  lines.forEach((line, i) => {
    for (const { id, re, message, replacement } of SECRET_PATTERNS) {
      re.lastIndex = 0
      if (re.test(line)) {
        out.push({
          id: `${id}-${i}`,
          severity: 'error',
          category: 'secret',
          message,
          line: i + 1,
          ...(replacement && {
            fix: {
              label: 'Redact secret',
              action: (currentMd: string) => {
                const currentLines = currentMd.split('\n')
                if (currentLines[i]) {
                  currentLines[i] = currentLines[i].replace(re, replacement)
                }
                return currentLines.join('\n')
              },
            },
          }),
        })
      }
    }
  })
  return out
}

export function scanMarkdownA11y(md: string): MarkdownInsight[] {
  const out: MarkdownInsight[] = []
  const lines = md.split('\n')

  const h1 = (md.match(/^#\s/gm) ?? []).length
  if (h1 === 0) {
    out.push({
      id: 'no-h1',
      severity: 'warning',
      category: 'a11y',
      message: 'No top-level # heading — screen reader users rely on a clear document title.',
      fix: {
        label: 'Add missing # Title',
        action: (currentMd: string) => `# Project Title\n\n${currentMd}`,
      },
    })
  }
  if (h1 > 1) {
    out.push({
      id: 'multi-h1',
      severity: 'warning',
      category: 'a11y',
      message: 'Multiple # headings can confuse outline navigation — prefer one title and ## for sections.',
    })
  }

  lines.forEach((line, i) => {
    if (/!\[([^\]]*)\]\([^)]+\)/.test(line)) {
      const m = line.match(/!\[([^\]]*)\]\([^)]+\)/)
      const alt = m?.[1]?.trim() ?? ''
      if (alt === '' || alt.toLowerCase() === 'image') {
        out.push({
          id: `alt-${i}`,
          severity: 'info',
          category: 'a11y',
          message: 'Image may need descriptive alt text for screen readers.',
          line: i + 1,
        })
      }
    }
  })

  return out
}

export function scanMarkdownI18n(md: string): MarkdownInsight[] {
  const out: MarkdownInsight[] = []
  if (/[\u0400-\u04FF]/.test(md) && /[A-Za-z]{3,}/.test(md)) {
    out.push({
      id: 'mixed-script',
      severity: 'info',
      category: 'i18n',
      message: 'Mixed scripts detected — consider separate localized README files (e.g. README.ja.md).',
    })
  }
  if (md.length > 8000 && !/^##\s+(Installation|Getting started)/im.test(md)) {
    out.push({
      id: 'long-readme',
      severity: 'info',
      category: 'i18n',
      message: 'Long document without an early Getting started section — non-native readers may struggle.',
    })
  }
  return out
}

export function analyzeMarkdown(md: string): MarkdownInsight[] {
  return [...scanMarkdownSecrets(md), ...scanMarkdownA11y(md), ...scanMarkdownI18n(md)]
}

export function calculateQualityScore(insights: MarkdownInsight[]): { score: number; grade: string } {
  let score = 100

  // Deduct based on severity
  for (const i of insights) {
    if (i.severity === 'error') score -= 25
    if (i.severity === 'warning') score -= 10
    if (i.severity === 'info') score -= 2
  }

  score = Math.max(0, Math.min(100, score))

  let grade = 'A'
  if (score < 90) grade = 'B'
  if (score < 80) grade = 'C'
  if (score < 70) grade = 'D'
  if (score < 60) grade = 'F'

  // Instant F if there are any error severity insights (i.e. exposed secrets)
  if (insights.some(i => i.severity === 'error')) {
    grade = 'F'
  }

  return { score, grade }
}
