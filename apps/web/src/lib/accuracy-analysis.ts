/**
 * Accuracy Analysis Engine v2
 * 
 * Smarter grounding verification with:
 * - Fuzzy matching for scoped packages (@langchain/groq → langchain)
 * - Realistic expectations (top 15 deps, not all 30)
 * - Partial credit for partial matches
 * - Better normalization
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

// --- Matching utilities ---

function normalizeMd(md: string): string {
  return md.toLowerCase()
}

/**
 * Smart fuzzy match that handles:
 * - Case insensitive
 * - Scoped packages: @langchain/groq matches "langchain" or "groq"
 * - Hyphenated names: next-themes matches "next themes" or "nextthemes"
 * - Common variations
 */
function smartMatch(md: string, term: string): boolean {
  if (!term || term.trim().length < 2) return false
  const mdLower = normalizeMd(md)
  const termLower = term.toLowerCase().trim()

  // Direct match
  if (mdLower.includes(termLower)) return true

  // For scoped packages like @langchain/groq, also check the parts
  if (termLower.startsWith('@')) {
    const withoutScope = termLower.replace(/^@[^/]+\//, '')
    if (withoutScope.length >= 3 && mdLower.includes(withoutScope)) return true
    // Also check the scope org name (e.g., "langchain" from "@langchain/groq")
    const scopeMatch = termLower.match(/^@([^/]+)/)
    if (scopeMatch && scopeMatch[1] && scopeMatch[1].length >= 3 && mdLower.includes(scopeMatch[1])) return true
  }

  // For hyphenated packages like "react-router-dom", check "react router dom"
  if (termLower.includes('-')) {
    const spaceSeparated = termLower.replace(/-/g, ' ')
    if (mdLower.includes(spaceSeparated)) return true
    // Also check without hyphens: "reactrouterdom" — unlikely but covers "ReactRouterDom"
    const noSep = termLower.replace(/-/g, '')
    if (noSep.length >= 4 && mdLower.includes(noSep)) return true
  }

  // For dotenv, express, etc. — check camelCase/PascalCase variations
  // "dotenv" might appear as "Dotenv" already covered by lowercase

  return false
}

// Common internal/tool packages that a README wouldn't normally mention
const SKIP_DEPS = new Set([
  'typescript', 'tslib', 'ts-node', 'ts-node-dev', 'nodemon',
  'eslint', 'prettier', 'rimraf', 'concurrently', 'cross-env',
  'husky', 'lint-staged', 'jest', 'vitest', 'mocha', 'chai',
  'webpack', 'vite', 'rollup', 'esbuild', 'turbo', 'tsup',
])

function isSignificantDep(dep: string): boolean {
  const name = dep.toLowerCase().replace(/^@[^/]+\//, '')
  if (dep.startsWith('@types/')) return false
  if (SKIP_DEPS.has(name)) return false
  if (SKIP_DEPS.has(dep)) return false
  return true
}

// --- Individual dimension checks ---

function checkProjectName(md: string, summary: any): AccuracyCheck {
  const name = summary.name || ''
  const found = name && smartMatch(md, name) ? [name] : []
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
      weight: 0.15,
      found: [],
      missing: [],
      total: 0,
    }
  }

  // Only check significant deps, max 15
  const significantDeps = deps.filter(isSignificantDep).slice(0, 15)
  const found: string[] = []
  const missing: string[] = []

  for (const dep of significantDeps) {
    if (smartMatch(md, dep)) {
      found.push(dep)
    } else {
      missing.push(dep)
    }
  }

  const total = significantDeps.length
  const score = total > 0 ? Math.round((found.length / total) * 100) : 100

  return {
    id: 'dependencies',
    dimension: 'Dependencies Coverage',
    description: 'Key production dependencies mentioned in README',
    score,
    weight: 0.15,
    found,
    missing,
    total,
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

  // Only care about user-facing scripts
  const importantPatterns = ['dev', 'build', 'start', 'test', 'lint', 'preview', 'serve', 'deploy']
  const relevantKeys = scriptKeys.filter(k => {
    const base = k.split(':').pop() || k
    return importantPatterns.some(p => base.includes(p))
  })

  const toCheck = relevantKeys.length > 0 ? relevantKeys : scriptKeys.slice(0, 6)
  const found: string[] = []
  const missing: string[] = []

  for (const key of toCheck) {
    const command = scripts[key] || ''
    const keyBase = key.split(':').pop() || key

    // Check script name, base name, or full command
    if (smartMatch(md, key) || smartMatch(md, keyBase) || smartMatch(md, command)) {
      found.push(key)
    } else {
      // Also check if the command's binary appears (e.g., "next dev" → check "next")
      const cmdBin = command.split(' ')[0]
      if (cmdBin && cmdBin.length >= 3 && smartMatch(md, cmdBin)) {
        found.push(key)
      } else {
        missing.push(key)
      }
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

  // Cap at 15 routes to be realistic
  const routesToCheck = routes.slice(0, 15)
  const found: string[] = []
  const missing: string[] = []

  for (const route of routesToCheck) {
    const routeStr = `${route.method.toUpperCase()} ${route.path}`
    // Check full path or key part of path
    if (smartMatch(md, route.path)) {
      found.push(routeStr)
    } else {
      // Also check last segment of the path (e.g., "/api/generate" → "generate")
      const segments = route.path.split('/').filter(Boolean)
      const lastSeg = segments[segments.length - 1]
      if (lastSeg && lastSeg.length >= 3 && smartMatch(md, lastSeg)) {
        found.push(routeStr)
      } else {
        missing.push(routeStr)
      }
    }
  }

  const score = routesToCheck.length > 0 ? Math.round((found.length / routesToCheck.length) * 100) : 100

  return {
    id: 'routes',
    dimension: 'API Routes Coverage',
    description: 'API endpoints/routes referenced in README',
    score,
    weight: 0.15,
    found,
    missing,
    total: routesToCheck.length,
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
    if (smartMatch(md, v)) {
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
      weight: 0.05,
      found: [],
      missing: [],
      total: 0,
    }
  }

  const found: string[] = []
  const missing: string[] = []

  for (const ep of entryPoints) {
    const basename = ep.split('/').pop() || ep
    const dirName = ep.split('/').slice(-2, -1)[0] || ''

    if (
      smartMatch(md, basename) ||
      smartMatch(md, ep) ||
      (dirName.length >= 3 && smartMatch(md, dirName))
    ) {
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
    weight: 0.05,
    found,
    missing,
    total: entryPoints.length,
  }
}

function checkTechStack(md: string, summary: any): AccuracyCheck {
  const items: string[] = []

  if (summary.language) items.push(summary.language)
  if (summary.framework?.name) items.push(summary.framework.name)
  if (summary.features && Array.isArray(summary.features)) {
    items.push(...summary.features.slice(0, 8))
  }
  if (summary.isMonorepo) items.push('monorepo')
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
    if (smartMatch(md, item)) {
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

  // Only check top 10 files — realistic expectation
  for (const file of files.slice(0, 10)) {
    const basename = file.path.split('/').pop() || file.path
    const dirName = file.path.split('/').slice(-2, -1)[0] || ''
    let fileFound = false

    // Check file path, basename, or parent dir
    if (smartMatch(md, basename) || smartMatch(md, file.path)) {
      fileFound = true
    }

    // Check directory name (e.g., "services", "controllers")
    if (!fileFound && dirName.length >= 3 && smartMatch(md, dirName)) {
      fileFound = true
    }

    // Check snippet identifiers
    if (!fileFound && file.snippets) {
      for (const snippet of file.snippets.slice(0, 5)) {
        // Try to extract names from various formats
        const nameMatch = snippet.match(/(?:Function|Class|Method|Interface|Export):\s*(\w+)/i)
        if (nameMatch?.[1] && nameMatch[1].length >= 3 && smartMatch(md, nameMatch[1])) {
          fileFound = true
          break
        }
        // Also try raw snippet — look for identifier-like words
        const words = snippet.match(/\b[A-Z][a-zA-Z]{3,}\b/g) || []
        for (const word of words.slice(0, 3)) {
          if (smartMatch(md, word)) {
            fileFound = true
            break
          }
        }
        if (fileFound) break
      }
    }

    if (fileFound) {
      found.push(file.path)
    } else {
      missing.push(file.path)
    }
  }

  const total = Math.min(files.length, 10)
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

  // Weighted score — only count dimensions that have data
  const activeChecks = checks.filter(c => c.total > 0)
  const totalWeight = activeChecks.reduce((sum, c) => sum + c.weight, 0)

  let overallScore: number
  if (totalWeight === 0) {
    overallScore = 100
  } else {
    overallScore = Math.round(
      activeChecks.reduce((sum, c) => sum + (c.score * c.weight), 0) / totalWeight
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
