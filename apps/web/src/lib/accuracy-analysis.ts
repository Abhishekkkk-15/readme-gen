/**
 * Accuracy Analysis Engine
 * 
 * Cross-references a generated README against the ProjectAnalysis data
 * to produce a factual accuracy score. Runs entirely client-side — no LLM calls.
 */

export interface AccuracyCheck {
  id: string
  dimension: string
  description: string
  score: number        // 0–100 for this dimension
  weight: number       // 0–1
  found: string[]
  missing: string[]
  total: number
}

export interface AccuracyResult {
  checks: AccuracyCheck[]
  overallScore: number
  grade: string
  analyzedAt: number
}

// Normalize text for fuzzy matching — lowercase, strip special chars
function norm(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9@/.\-_]/g, ' ').trim()
}

function mdContains(md: string, term: string): boolean {
  if (!term || term.trim().length < 2) return false
  const normalized = norm(md)
  const target = norm(term)
  return normalized.includes(target)
}

// --- Individual dimension checks ---

function checkProjectName(md: string, summary: any): AccuracyCheck {
  const name = summary.name || ''
  const found = name && mdContains(md, name) ? [name] : []
  const missing = found.length === 0 && name ? [name] : []

  return {
    id: 'project-name',
    dimension: 'Project Name',
    description: 'README mentions the project name',
    score: found.length > 0 ? 100 : 0,
    weight: 0.05,
    found,
    missing,
    total: name ? 1 : 0,
  }
}

function checkDependencies(md: string, summary: any): AccuracyCheck {
  const deps: string[] = summary.dependencies || []
  if (deps.length === 0) {
    return {
      id: 'dependencies',
      dimension: 'Dependencies Coverage',
      description: 'Key production dependencies mentioned in README',
      score: 100,
      weight: 0.20,
      found: [],
      missing: [],
      total: 0,
    }
  }

  // Focus on the top dependencies (most important ones)
  const keyDeps = deps.slice(0, 30)
  const found: string[] = []
  const missing: string[] = []

  for (const dep of keyDeps) {
    // Skip type packages and very generic ones
    if (dep.startsWith('@types/')) continue
    if (mdContains(md, dep)) {
      found.push(dep)
    } else {
      missing.push(dep)
    }
  }

  const effectiveTotal = keyDeps.filter(d => !d.startsWith('@types/')).length
  const score = effectiveTotal > 0 ? Math.round((found.length / effectiveTotal) * 100) : 100

  return {
    id: 'dependencies',
    dimension: 'Dependencies Coverage',
    description: 'Key production dependencies mentioned in README',
    score,
    weight: 0.20,
    found,
    missing,
    total: effectiveTotal,
  }
}

function checkScripts(md: string, summary: any): AccuracyCheck {
  const scripts: Record<string, string> = summary.scripts || {}
  const scriptKeys = Object.keys(scripts)

  if (scriptKeys.length === 0) {
    return {
      id: 'scripts',
      dimension: 'Scripts Coverage',
      description: 'Package scripts (dev, build, start, etc.) mentioned in README',
      score: 100,
      weight: 0.15,
      found: [],
      missing: [],
      total: 0,
    }
  }

  // Key scripts that users care about
  const importantPatterns = ['dev', 'build', 'start', 'test', 'lint', 'preview', 'install']
  const relevantKeys = scriptKeys.filter(k => {
    const base = k.split(':').pop() || k
    return importantPatterns.some(p => base.includes(p))
  })

  // If no "important" scripts, check all
  const toCheck = relevantKeys.length > 0 ? relevantKeys : scriptKeys.slice(0, 10)

  const found: string[] = []
  const missing: string[] = []

  for (const key of toCheck) {
    // Check if the script name or the command appears
    const command = scripts[key] || ''
    const keyBase = key.split(':').pop() || key

    if (mdContains(md, keyBase) || mdContains(md, command)) {
      found.push(key)
    } else {
      missing.push(key)
    }
  }

  const score = toCheck.length > 0 ? Math.round((found.length / toCheck.length) * 100) : 100

  return {
    id: 'scripts',
    dimension: 'Scripts Coverage',
    description: 'Package scripts (dev, build, start, etc.) mentioned in README',
    score,
    weight: 0.15,
    found,
    missing,
    total: toCheck.length,
  }
}

function checkRoutes(md: string, summary: any): AccuracyCheck {
  const routes: { method: string; path: string }[] = summary.routes || []

  if (routes.length === 0) {
    return {
      id: 'routes',
      dimension: 'API Routes Coverage',
      description: 'API endpoints/routes referenced in README',
      score: 100,
      weight: 0.15,
      found: [],
      missing: [],
      total: 0,
    }
  }

  const found: string[] = []
  const missing: string[] = []

  for (const route of routes) {
    const routeStr = `${route.method.toUpperCase()} ${route.path}`
    // Check if path appears in README
    if (mdContains(md, route.path)) {
      found.push(routeStr)
    } else {
      missing.push(routeStr)
    }
  }

  const score = routes.length > 0 ? Math.round((found.length / routes.length) * 100) : 100

  return {
    id: 'routes',
    dimension: 'API Routes Coverage',
    description: 'API endpoints/routes referenced in README',
    score,
    weight: 0.15,
    found,
    missing,
    total: routes.length,
  }
}

function checkEnvVars(md: string, summary: any): AccuracyCheck {
  const envVars: string[] = summary.envVars || []

  if (envVars.length === 0) {
    return {
      id: 'env-vars',
      dimension: 'Environment Variables',
      description: 'Environment variables documented in README',
      score: 100,
      weight: 0.10,
      found: [],
      missing: [],
      total: 0,
    }
  }

  const found: string[] = []
  const missing: string[] = []

  for (const v of envVars) {
    if (mdContains(md, v)) {
      found.push(v)
    } else {
      missing.push(v)
    }
  }

  const score = envVars.length > 0 ? Math.round((found.length / envVars.length) * 100) : 100

  return {
    id: 'env-vars',
    dimension: 'Environment Variables',
    description: 'Environment variables documented in README',
    score,
    weight: 0.10,
    found,
    missing,
    total: envVars.length,
  }
}

function checkEntryPoints(md: string, summary: any): AccuracyCheck {
  const entryPoints: string[] = summary.entryPoints || []

  if (entryPoints.length === 0) {
    return {
      id: 'entry-points',
      dimension: 'Entry Points',
      description: 'Project entry point files referenced in README',
      score: 100,
      weight: 0.10,
      found: [],
      missing: [],
      total: 0,
    }
  }

  const found: string[] = []
  const missing: string[] = []

  for (const ep of entryPoints) {
    // Check for the file name (basename or full path)
    const basename = ep.split('/').pop() || ep
    if (mdContains(md, basename) || mdContains(md, ep)) {
      found.push(ep)
    } else {
      missing.push(ep)
    }
  }

  const score = entryPoints.length > 0 ? Math.round((found.length / entryPoints.length) * 100) : 100

  return {
    id: 'entry-points',
    dimension: 'Entry Points',
    description: 'Project entry point files referenced in README',
    score,
    weight: 0.10,
    found,
    missing,
    total: entryPoints.length,
  }
}

function checkTechStack(md: string, summary: any): AccuracyCheck {
  const items: string[] = []

  // Language
  if (summary.language) items.push(summary.language)

  // Framework
  if (summary.framework?.name) items.push(summary.framework.name)

  // Features (AST-detected patterns)
  if (summary.features && Array.isArray(summary.features)) {
    items.push(...summary.features.slice(0, 8))
  }

  // Monorepo flag
  if (summary.isMonorepo) items.push('monorepo')

  // Docker
  if (summary.hasDocker) items.push('Docker')

  if (items.length === 0) {
    return {
      id: 'tech-stack',
      dimension: 'Tech Stack Accuracy',
      description: 'Detected language, framework, and features mentioned in README',
      score: 100,
      weight: 0.15,
      found: [],
      missing: [],
      total: 0,
    }
  }

  const unique = Array.from(new Set(items))
  const found: string[] = []
  const missing: string[] = []

  for (const item of unique) {
    if (mdContains(md, item)) {
      found.push(item)
    } else {
      missing.push(item)
    }
  }

  const score = unique.length > 0 ? Math.round((found.length / unique.length) * 100) : 100

  return {
    id: 'tech-stack',
    dimension: 'Tech Stack Accuracy',
    description: 'Detected language, framework, and features mentioned in README',
    score,
    weight: 0.15,
    found,
    missing,
    total: unique.length,
  }
}

function checkEvidenceGrounding(md: string, context: any): AccuracyCheck {
  const files: { path: string; snippets: string[] }[] = context?.evidence?.files || []

  if (files.length === 0) {
    return {
      id: 'evidence',
      dimension: 'Evidence Grounding',
      description: 'Code evidence (files, function names) referenced in README',
      score: 100,
      weight: 0.10,
      found: [],
      missing: [],
      total: 0,
    }
  }

  const found: string[] = []
  const missing: string[] = []

  // Check file paths and extract function/class names from snippets
  for (const file of files.slice(0, 20)) {
    const basename = file.path.split('/').pop() || file.path
    let fileFound = false

    // Check file path/name
    if (mdContains(md, basename) || mdContains(md, file.path)) {
      fileFound = true
    }

    // Check key snippet names (function/class names)
    if (!fileFound && file.snippets) {
      for (const snippet of file.snippets.slice(0, 5)) {
        // Extract identifiers from snippets like "Function: generate" or "Class: RepoService"
        const nameMatch = snippet.match(/(?:Function|Class|Method|Interface):\s*(\w+)/i)
        if (nameMatch && nameMatch[1] && mdContains(md, nameMatch[1])) {
          fileFound = true
          break
        }
      }
    }

    if (fileFound) {
      found.push(file.path)
    } else {
      missing.push(file.path)
    }
  }

  const total = Math.min(files.length, 20)
  const score = total > 0 ? Math.round((found.length / total) * 100) : 100

  return {
    id: 'evidence',
    dimension: 'Evidence Grounding',
    description: 'Code evidence (files, function names) referenced in README',
    score,
    weight: 0.10,
    found,
    missing,
    total,
  }
}

// --- Main analysis function ---

export function analyzeAccuracy(markdown: string, analysis: any): AccuracyResult {
  if (!analysis || !analysis.summary) {
    return {
      checks: [],
      overallScore: 0,
      grade: '—',
      analyzedAt: Date.now(),
    }
  }

  const { summary, context } = analysis

  const checks: AccuracyCheck[] = [
    checkProjectName(markdown, summary),
    checkDependencies(markdown, summary),
    checkScripts(markdown, summary),
    checkRoutes(markdown, summary),
    checkEnvVars(markdown, summary),
    checkEntryPoints(markdown, summary),
    checkTechStack(markdown, summary),
    checkEvidenceGrounding(markdown, context),
  ]

  // Calculate weighted overall score
  const totalWeight = checks.reduce((sum, c) => sum + (c.total > 0 ? c.weight : 0), 0)
  
  let overallScore: number
  if (totalWeight === 0) {
    overallScore = 100
  } else {
    overallScore = Math.round(
      checks.reduce((sum, c) => {
        if (c.total === 0) return sum
        return sum + (c.score * c.weight)
      }, 0) / totalWeight
    )
  }

  overallScore = Math.max(0, Math.min(100, overallScore))

  let grade = 'A'
  if (overallScore < 90) grade = 'B'
  if (overallScore < 75) grade = 'C'
  if (overallScore < 60) grade = 'D'
  if (overallScore < 40) grade = 'F'

  return {
    checks,
    overallScore,
    grade,
    analyzedAt: Date.now(),
  }
}
