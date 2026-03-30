import { useMemo, useState } from 'react'
import { 
  Target, ChevronDown, ChevronRight, CheckCircle2, XCircle, AlertTriangle, 
  Package, Terminal, Globe, Key, FileCode, Cpu, Search, Hash
} from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { ScrollArea } from '@/components/ui/scroll-area'
import { analyzeAccuracy, type AccuracyCheck, type AccuracyResult } from '@/lib/accuracy-analysis'
import { cn } from '@/lib/utils'

type AccuracyInsightsProps = {
  markdown: string
  analysis: any | null
  className?: string
}

const dimensionIcons: Record<string, any> = {
  'project-name': Hash,
  'dependencies': Package,
  'scripts': Terminal,
  'routes': Globe,
  'env-vars': Key,
  'entry-points': FileCode,
  'tech-stack': Cpu,
  'evidence': Search,
}

function ScoreRing({ score, grade, size = 48 }: { score: number; grade: string; size?: number }) {
  const radius = (size - 6) / 2
  const circumference = 2 * Math.PI * radius
  const offset = circumference - (score / 100) * circumference

  return (
    <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={3}
          className="text-muted/30"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          strokeWidth={3}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className={cn(
            'transition-all duration-700 ease-out',
            score >= 80 ? 'text-emerald-500' :
            score >= 60 ? 'text-amber-500' :
            'text-red-500'
          )}
          stroke="currentColor"
        />
      </svg>
      <span className={cn(
        'absolute text-sm font-bold',
        score >= 80 ? 'text-emerald-600 dark:text-emerald-400' :
        score >= 60 ? 'text-amber-600 dark:text-amber-400' :
        'text-red-600 dark:text-red-400'
      )}>
        {grade}
      </span>
    </div>
  )
}

function DimensionBar({ check }: { check: AccuracyCheck }) {
  const [expanded, setExpanded] = useState(false)
  const Icon = dimensionIcons[check.id] || Target
  const hasMissing = check.missing.length > 0
  const isSkipped = check.total === 0

  return (
    <div className="border rounded-lg overflow-hidden">
      <button
        type="button"
        className={cn(
          'w-full flex items-center gap-3 px-3 py-2.5 text-left transition-colors text-sm',
          hasMissing && !isSkipped ? 'hover:bg-amber-500/5' : 'hover:bg-muted/50'
        )}
        onClick={() => !isSkipped && setExpanded(!expanded)}
        disabled={isSkipped}
      >
        <Icon className={cn(
          'size-4 shrink-0',
          isSkipped ? 'text-muted-foreground/40' :
          check.score >= 80 ? 'text-emerald-500' :
          check.score >= 50 ? 'text-amber-500' :
          'text-red-500'
        )} />
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <span className={cn('font-medium text-xs', isSkipped && 'text-muted-foreground/60')}>
              {check.dimension}
            </span>
            {isSkipped ? (
              <Badge variant="secondary" className="text-[10px] h-5 px-1.5 opacity-50">N/A</Badge>
            ) : (
              <span className={cn(
                'text-xs font-semibold tabular-nums',
                check.score >= 80 ? 'text-emerald-600 dark:text-emerald-400' :
                check.score >= 50 ? 'text-amber-600 dark:text-amber-400' :
                'text-red-600 dark:text-red-400'
              )}>
                {check.score}%
              </span>
            )}
          </div>
          
          {!isSkipped && (
            <div className="mt-1.5 h-1.5 rounded-full bg-muted overflow-hidden">
              <div
                className={cn(
                  'h-full rounded-full transition-all duration-500 ease-out',
                  check.score >= 80 ? 'bg-emerald-500' :
                  check.score >= 50 ? 'bg-amber-500' :
                  'bg-red-500'
                )}
                style={{ width: `${check.score}%` }}
              />
            </div>
          )}
        </div>

        {!isSkipped && (
          <div className="shrink-0">
            {expanded ? 
              <ChevronDown className="size-3.5 text-muted-foreground" /> : 
              <ChevronRight className="size-3.5 text-muted-foreground" />
            }
          </div>
        )}
      </button>

      {expanded && !isSkipped && (
        <div className="px-3 pb-3 border-t bg-muted/20">
          <p className="text-[11px] text-muted-foreground py-2 italic">{check.description}</p>
          
          <div className="flex gap-2 text-[11px] mb-2">
            <span className="text-emerald-600 dark:text-emerald-400 font-medium">
              {check.found.length} found
            </span>
            <span className="text-muted-foreground">·</span>
            <span className={cn(
              'font-medium',
              check.missing.length > 0 ? 'text-red-600 dark:text-red-400' : 'text-muted-foreground'
            )}>
              {check.missing.length} missing
            </span>
            <span className="text-muted-foreground">·</span>
            <span className="text-muted-foreground">{check.total} total</span>
          </div>

          {check.found.length > 0 && (
            <div className="mb-2">
              <p className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider mb-1">
                Found in README
              </p>
              <div className="flex flex-wrap gap-1">
                {check.found.slice(0, 12).map((item, i) => (
                  <Badge key={i} variant="secondary" className="text-[10px] h-5 px-1.5 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/20">
                    <CheckCircle2 className="size-2.5 mr-1" />
                    {item.length > 30 ? item.slice(0, 30) + '…' : item}
                  </Badge>
                ))}
                {check.found.length > 12 && (
                  <Badge variant="secondary" className="text-[10px] h-5 px-1.5 opacity-60">
                    +{check.found.length - 12} more
                  </Badge>
                )}
              </div>
            </div>
          )}

          {check.missing.length > 0 && (
            <div>
              <p className="text-[10px] font-semibold text-red-600 dark:text-red-400 uppercase tracking-wider mb-1">
                Missing from README
              </p>
              <div className="flex flex-wrap gap-1">
                {check.missing.slice(0, 12).map((item, i) => (
                  <Badge key={i} variant="secondary" className="text-[10px] h-5 px-1.5 bg-red-500/10 text-red-700 dark:text-red-300 border-red-500/20">
                    <XCircle className="size-2.5 mr-1" />
                    {item.length > 30 ? item.slice(0, 30) + '…' : item}
                  </Badge>
                ))}
                {check.missing.length > 12 && (
                  <Badge variant="secondary" className="text-[10px] h-5 px-1.5 opacity-60">
                    +{check.missing.length - 12} more
                  </Badge>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export function AccuracyInsights({ markdown, analysis, className }: AccuracyInsightsProps) {
  const result: AccuracyResult | null = useMemo(() => {
    if (!analysis || !analysis.summary) return null
    return analyzeAccuracy(markdown, analysis)
  }, [markdown, analysis])

  if (!result || result.checks.length === 0) {
    return (
      <Card className={cn('flex flex-col', className)}>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Accuracy scorecard</CardTitle>
          <CardDescription>Grounding verification against analysis data.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-1 flex-col items-center justify-center text-center py-8">
          <Target className="text-muted-foreground/30 mb-3 size-10" />
          <p className="text-foreground text-sm font-medium">No analysis data</p>
          <p className="text-muted-foreground mt-1 text-xs max-w-[240px]">
            Fetch a GitHub repository first to enable accuracy scoring.
          </p>
        </CardContent>
      </Card>
    )
  }

  const activeChecks = result.checks.filter(c => c.total > 0)
  const perfectCount = activeChecks.filter(c => c.score === 100).length
  const weakChecks = activeChecks.filter(c => c.score < 60)

  return (
    <Card className={cn('flex flex-col', className)}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-base">Accuracy scorecard</CardTitle>
            <CardDescription>How well the README reflects the codebase.</CardDescription>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex flex-col items-end">
              <span className="text-sm font-medium">Score</span>
              <span className="text-2xl font-bold tracking-tight">{result.overallScore}</span>
            </div>
            <ScoreRing score={result.overallScore} grade={result.grade} />
          </div>
        </div>
      </CardHeader>
      <CardContent className="flex min-h-0 flex-1 flex-col">
        <div className="mb-3 flex flex-wrap gap-2 text-xs">
          <Badge variant={weakChecks.length > 0 ? 'destructive' : 'secondary'}>
            {weakChecks.length} weak
          </Badge>
          <Badge variant="outline">
            {perfectCount}/{activeChecks.length} perfect
          </Badge>
          {result.overallScore >= 80 && (
            <Badge variant="secondary" className="bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/20">
              Well grounded
            </Badge>
          )}
        </div>

        {result.overallScore < 60 && (
          <div className="flex items-start gap-2 rounded-md border border-amber-500/40 bg-amber-500/5 px-3 py-2 text-xs mb-3">
            <AlertTriangle className="size-3.5 text-amber-500 mt-0.5 shrink-0" />
            <p className="text-muted-foreground">
              The README may contain hallucinated content. Consider regenerating with more specific analysis data.
            </p>
          </div>
        )}

        <ScrollArea className="h-64 pr-1 flex-1">
          <div className="space-y-2">
            {result.checks.map(check => (
              <DimensionBar key={check.id} check={check} />
            ))}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  )
}
