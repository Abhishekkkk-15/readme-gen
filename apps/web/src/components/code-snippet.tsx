import { Check, Copy } from 'lucide-react'
import { useState } from 'react'
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
import { oneDark, oneLight } from 'react-syntax-highlighter/dist/esm/styles/prism'
import { toast } from 'sonner'
import { useTheme } from 'next-themes'

import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

type CodeSnippetProps = {
  code: string
  language?: string
  className?: string
  title?: string
}

export function CodeSnippet({ code, language = 'bash', className, title }: CodeSnippetProps) {
  const [copied, setCopied] = useState(false)
  const { resolvedTheme } = useTheme()
  const style = resolvedTheme === 'dark' ? oneDark : oneLight

  async function copy() {
    await navigator.clipboard.writeText(code)
    setCopied(true)
    toast.success('Copied to clipboard')
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div
      className={cn(
        'bg-muted/50 border-border overflow-hidden rounded-xl border text-left shadow-sm',
        className,
      )}
    >
      <div className="bg-muted/80 flex items-center justify-between gap-2 border-b px-3 py-2">
        <span className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
          {title ?? language}
        </span>
        <Button type="button" variant="ghost" size="icon-xs" onClick={copy} aria-label="Copy code">
          {copied ? <Check className="size-3.5 text-emerald-500" /> : <Copy className="size-3.5" />}
        </Button>
      </div>
      <SyntaxHighlighter
        language={language}
        style={style}
        customStyle={{
          margin: 0,
          padding: '1rem',
          background: 'transparent',
          fontSize: '0.8125rem',
          lineHeight: 1.55,
        }}
        PreTag="div"
      >
        {code.trimEnd()}
      </SyntaxHighlighter>
    </div>
  )
}
