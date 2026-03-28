import { diffLines } from 'diff'

import { ScrollArea } from '@/components/ui/scroll-area'
import { cn } from '@/lib/utils'

type MarkdownDiffProps = {
  before: string
  after: string
  className?: string
}

export function MarkdownDiff({ before, after, className }: MarkdownDiffProps) {
  const parts = diffLines(before, after)

  // Split out lines so we can align them nicely
  let leftLine = 1
  let rightLine = 1
  const rows: { added?: boolean; removed?: boolean; value: string; lNum?: number; rNum?: number }[] = []

  for (const part of parts) {
    const lines = part.value.split('\n')
    // Remove last empty string from split if it ends with newline
    if (lines[lines.length - 1] === '') lines.pop()

    for (const line of lines) {
      if (part.added) {
        rows.push({ added: true, value: line, rNum: rightLine++ })
      } else if (part.removed) {
        rows.push({ removed: true, value: line, lNum: leftLine++ })
      } else {
        rows.push({ value: line, lNum: leftLine++, rNum: rightLine++ })
      }
    }
  }

  return (
    <ScrollArea className={cn('border-border bg-card/50 max-h-[min(480px,55vh)] rounded-lg border shadow-inner', className)}>
      <table className="w-full text-left font-mono text-[11px] sm:text-xs">
        <colgroup>
          <col className="w-10 sm:w-12" />
          <col className="w-5 sm:w-8" />
          <col className="w-[calc(50%-2.5rem)] sm:w-[calc(50%-3.5rem)]" />
          <col className="w-10 sm:w-12" />
          <col className="w-5 sm:w-8" />
          <col className="w-[calc(50%-2.5rem)] sm:w-[calc(50%-3.5rem)]" />
        </colgroup>
        <tbody className="divide-y divide-border/30">
          {rows.map((row, i) => (
            <tr key={i} className="align-top hover:bg-muted/30">
              {/* Left Side (Before) */}
              <td className="sticky left-0 bg-muted/20 select-none text-right pr-2 py-1 border-r text-muted-foreground/60 w-12 border-border/50">
                {row.lNum || ''}
              </td>
              <td className={cn('select-none text-center font-bold py-1 w-8', row.removed ? 'bg-red-500/15 text-red-500' : 'bg-transparent text-transparent')}>
                {row.removed ? '-' : ' '}
              </td>
              <td className={cn('py-1 pr-4 whitespace-pre-wrap break-all', row.removed ? 'bg-red-500/10 text-red-900 dark:text-red-200' : row.added ? 'bg-stripes bg-muted/10 text-transparent select-none' : 'text-muted-foreground')}>
                {row.added ? ' ' : row.value || ' '}
              </td>

              {/* Right Side (After) */}
              <td className="sticky left-12 sm:left-12 bg-muted/20 select-none text-right pr-2 py-1 border-r border-l text-muted-foreground/60 w-12 border-border/50">
                {row.rNum || ''}
              </td>
              <td className={cn('select-none text-center font-bold py-1 w-8', row.added ? 'bg-emerald-500/15 text-emerald-500' : 'bg-transparent text-transparent')}>
                {row.added ? '+' : ' '}
              </td>
              <td className={cn('py-1 pr-4 whitespace-pre-wrap break-all', row.added ? 'bg-emerald-500/10 text-emerald-900 dark:text-emerald-200' : row.removed ? 'bg-stripes bg-muted/10 text-transparent select-none' : 'text-foreground')}>
                {row.removed ? ' ' : row.value || ' '}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </ScrollArea>
  )
}
