import { lazy, Suspense } from 'react'

const MonacoEditor = lazy(() => import('@monaco-editor/react'))

type LazyMarkdownEditorProps = {
  height: string
  defaultLanguage: string
  theme: string
  value: string
  onChange: (value: string | undefined) => void
  options?: Record<string, unknown>
  className?: string
}

export function LazyMarkdownEditor({
  height,
  defaultLanguage,
  theme,
  value,
  onChange,
  options,
  className,
}: LazyMarkdownEditorProps) {
  return (
    <Suspense
      fallback={
        <div className="bg-muted/40 text-muted-foreground flex min-h-[280px] items-center justify-center rounded-md text-sm lg:min-h-[480px]">
          Loading editor…
        </div>
      }
    >
      <MonacoEditor
        height={height}
        defaultLanguage={defaultLanguage}
        theme={theme}
        value={value}
        onChange={onChange}
        options={options as never}
        className={className}
      />
    </Suspense>
  )
}
