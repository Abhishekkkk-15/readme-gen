import { AlertTriangle, Globe, ShieldAlert, Sparkles, CheckCircle2 } from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { ScrollArea } from '@/components/ui/scroll-area'
import { analyzeMarkdown, calculateQualityScore, type MarkdownInsight } from '@/lib/markdown-analysis'
import { cn } from '@/lib/utils'

type QualityInsightsProps = {
  markdown: string
  onFix?: (newMarkdown: string) => void
  className?: string
}

function iconFor(cat: MarkdownInsight['category']) {
  switch (cat) {
    case 'secret':
      return ShieldAlert
    case 'a11y':
      return AlertTriangle
    default:
      return Globe
  }
}

export function QualityInsights({ markdown, onFix, className }: QualityInsightsProps) {
  const insights = analyzeMarkdown(markdown)
  const { score, grade } = calculateQualityScore(insights)
  const errors = insights.filter((i) => i.severity === 'error')
  const warnings = insights.filter((i) => i.severity === 'warning')
  const infos = insights.filter((i) => i.severity === 'info')

  return (
    <Card className={cn('flex flex-col', className)}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-base">Quality scorecard</CardTitle>
            <CardDescription>Secrets, a11y, and structure checks.</CardDescription>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex flex-col items-end">
              <span className="text-sm font-medium">Score</span>
              <span className="text-2xl font-bold tracking-tight">{score}</span>
            </div>
            <div
              className={cn(
                'flex size-10 items-center justify-center rounded-full text-lg font-bold shadow-sm',
                grade === 'A' ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' :
                grade === 'B' ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400' :
                grade === 'C' ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400' :
                grade === 'D' ? 'bg-orange-500/10 text-orange-600 dark:text-orange-400' :
                'bg-destructive/10 text-destructive'
              )}
            >
              {grade}
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="flex min-h-0 flex-1 flex-col">
        <div className="mb-3 flex flex-wrap gap-2 text-xs">
          <Badge variant={errors.length ? 'destructive' : 'secondary'}>{errors.length} critical</Badge>
          <Badge variant={warnings.length ? 'outline' : 'secondary'}>{warnings.length} warnings</Badge>
          <Badge variant="outline">{infos.length} hints</Badge>
        </div>
        
        {insights.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center text-center">
            <CheckCircle2 className="text-emerald-500 mb-2 size-8" />
            <p className="text-foreground text-sm font-medium">Perfect score</p>
            <p className="text-muted-foreground mt-1 text-xs">No issues flagged in this markdown.</p>
          </div>
        ) : (
          <ScrollArea className="h-48 pr-3 flex-1">
            <ul className="space-y-2">
              {insights.map((i) => {
                const Icon = iconFor(i.category)
                return (
                  <li
                    key={i.id}
                    className={cn(
                      'flex items-start gap-3 rounded-md border px-3 py-2 text-sm',
                      i.severity === 'error' && 'border-destructive/40 bg-destructive/5',
                      i.severity === 'warning' && 'border-amber-500/40 bg-amber-500/5',
                      i.severity === 'info' && 'border-border bg-muted/30',
                    )}
                  >
                    <Icon className={cn("mt-0.5 size-4 shrink-0", 
                      i.severity === 'error' ? 'text-destructive' :
                      i.severity === 'warning' ? 'text-amber-500' : 'opacity-80'
                    )} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <p className="font-semibold capitalize text-foreground">{i.category}</p>
                        {i.line != null && (
                          <span className="text-muted-foreground font-mono text-[10px]">L{i.line}</span>
                        )}
                      </div>
                      <p className="text-muted-foreground text-xs mt-0.5">{i.message}</p>
                      
                      {i.fix && onFix && (
                        <Button 
                          variant="secondary" 
                          size="sm" 
                          className="mt-2 h-7 gap-1.5 text-xs w-full justify-start"
                          onClick={() => onFix(i.fix!.action(markdown))}
                        >
                          <Sparkles className="size-3 text-primary" />
                          {i.fix.label}
                        </Button>
                      )}
                    </div>
                  </li>
                )
              })}
            </ul>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  )
}
