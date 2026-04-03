import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
import { oneDark, oneLight } from 'react-syntax-highlighter/dist/esm/styles/prism'
import { useTheme } from 'next-themes'
import ReactMarkdown from 'react-markdown'
import { useEffect, useRef, useState } from 'react'
import mermaid from 'mermaid'

import { cn } from '@/lib/utils'

mermaid.initialize({
  startOnLoad: false,
})

function MermaidChart({ code, theme }: { code: string; theme?: string }) {
  const ref = useRef<HTMLDivElement>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    mermaid.initialize({
      startOnLoad: false,
      theme: theme === 'dark' ? 'dark' : 'default',
    })

    if (ref.current) {
      ref.current.innerHTML = ''
      setError(null)
      
      const id = `mermaid-${Math.random().toString(36).substring(7)}`
      mermaid
        .render(id, code)
        .then(({ svg }: { svg: string }) => {
          if (ref.current) {
            ref.current.innerHTML = svg
          }
        })
        .catch((err: any) => {
          console.error("Mermaid syntax error:", err)
          setError(err.message || String(err))
          if (ref.current) {
             const errorDiv = document.getElementById(`d${id}`);
             if(errorDiv) errorDiv.remove()
          }
        })
    }
  }, [code, theme])

  if (error) {
    return (
      <div className="my-4 overflow-auto rounded-md border border-destructive bg-destructive/10 p-4 font-mono text-xs text-destructive">
        <strong>Mermaid Syntax Error:</strong>
        <pre className="mt-2 whitespace-pre-wrap">{error}</pre>
        <pre className="mt-4 border-t border-destructive/20 pt-2 text-[10px] opacity-70">
          {code}
        </pre>
      </div>
    )
  }

  return (
    <div
      ref={ref}
      className="my-4 flex items-center justify-center overflow-auto rounded-md border py-4"
    />
  )
}

type MarkdownPreviewProps = {
  content: string
  className?: string
}

export function MarkdownPreview({ content, className }: MarkdownPreviewProps) {
  const { resolvedTheme } = useTheme()
  const style = resolvedTheme === 'dark' ? oneDark : oneLight

  return (
    <div
      className={cn(
        'text-foreground max-w-none space-y-3 text-sm leading-relaxed [&_h1]:text-2xl [&_h1]:font-semibold [&_h1]:tracking-tight [&_h2]:mt-6 [&_h2]:text-lg [&_h2]:font-semibold [&_h3]:text-base [&_h3]:font-medium [&_li]:ml-4 [&_li]:list-disc [&_ol]:ml-4 [&_ol]:list-decimal [&_p]:text-muted-foreground [&_a]:text-primary [&_a]:underline [&_blockquote]:border-border [&_blockquote]:text-muted-foreground [&_blockquote]:border-l-2 [&_blockquote]:pl-4',
        className,
      )}
    >
      <ReactMarkdown
        components={{
          code({ className: codeClass, children, ...props }) {
            const match = /language-(\w+)/.exec(codeClass ?? '')
            const isBlock = Boolean(match)
            if (!isBlock) {
               // Check if it's rendered inline but actually a codeblock without language
              return (
                <code
                  className="bg-muted text-foreground rounded px-1.5 py-0.5 font-mono text-[0.85em]"
                  {...props}
                >
                  {children}
                </code>
              )
            }
            const lang = match?.[1] ?? 'text'
            const code = String(children).replace(/\n$/, '')
            
            if (lang === 'mermaid') {
              return <MermaidChart code={code} theme={resolvedTheme} />
            }

            return (
              <SyntaxHighlighter
                style={style}
                language={lang}
                PreTag="div"
                customStyle={{
                  margin: '0.75rem 0',
                  padding: '1rem',
                  borderRadius: '0.5rem',
                  fontSize: '0.8125rem',
                }}
              >
                {code}
              </SyntaxHighlighter>
            )
          },
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  )
}
