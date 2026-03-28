import { FileText } from 'lucide-react'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { ScrollArea } from '@/components/ui/scroll-area'

type SourcesPanelProps = {
  sources: string[]
  className?: string
}

export function SourcesPanel({ sources, className }: SourcesPanelProps) {
  return (
    <Card className={className}>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <FileText className="size-4" />
          Sources used
        </CardTitle>
        <CardDescription>Files and signals that influenced this draft (demo tracking).</CardDescription>
      </CardHeader>
      <CardContent>
        {sources.length === 0 ? (
          <p className="text-muted-foreground text-sm">Import a repo or upload manifests to populate sources.</p>
        ) : (
          <ScrollArea className="max-h-36">
            <ul className="space-1 text-sm">
              {sources.map((s) => (
                <li key={s} className="text-muted-foreground font-mono text-xs">
                  {s}
                </li>
              ))}
            </ul>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  )
}
