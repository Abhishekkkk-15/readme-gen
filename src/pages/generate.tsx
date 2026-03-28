import {
  DndContext,
  type DragEndEvent,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
} from '@dnd-kit/core'
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import Editor from '@monaco-editor/react'
import { useTheme } from 'next-themes'
import { GripVertical, Link2, Save, Share2 } from 'lucide-react'
import { useCallback, useMemo, useState } from 'react'
import { Link, Navigate, useSearchParams } from 'react-router-dom'
import { toast } from 'sonner'

import { MarkdownPreview } from '@/components/markdown-preview'
import { ModelSelector } from '@/components/model-selector'
import { buttonVariants } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useAuth } from '@/contexts/auth-context'
import { mockModels } from '@/data/mock'
import { cn } from '@/lib/utils'

const sectionOptions = ['Installation', 'Usage', 'API', 'Contributing', 'License', 'Badges'] as const

const defaultMd = `# readme-gen

> AI-native README template — replace with your project voice.

## Installation

\`\`\`bash
npm install
\`\`\`

## Usage

Describe how to run the app locally.

## API

Document public endpoints or SDK entry points.

## Contributing

PRs welcome. Please run tests before submitting.

## License

MIT
`

function parseSectionOrder(md: string): { id: string; title: string }[] {
  const re = /^## (.+)$/gm
  const out: { id: string; title: string }[] = []
  let m: RegExpExecArray | null
  while ((m = re.exec(md)) !== null) {
    const title = m[1]!.trim()
    out.push({ id: title.toLowerCase().replace(/\s+/g, '-'), title })
  }
  return out.length ? out : [{ id: 'body', title: 'Document' }]
}

function reorderMarkdownBySections(md: string, order: { id: string; title: string }[]) {
  const blocks = md.split(/(?=^## )/m).map((b) => b.trim()).filter(Boolean)
  const map = new Map<string, string>()
  for (const b of blocks) {
    const line = b.match(/^## (.+)$/m)
    if (line) map.set(line[1]!.trim().toLowerCase(), b)
  }
  const intro = blocks[0] && !blocks[0].startsWith('##') ? `${blocks[0]}\n\n` : ''
  const ordered = order
    .map((o) => map.get(o.title.toLowerCase()))
    .filter(Boolean)
    .join('\n\n')
  return (intro + ordered).trim() + '\n'
}

export function GeneratePage() {
  const { isAuthenticated } = useAuth()
  const [params] = useSearchParams()
  const { resolvedTheme } = useTheme()

  const [step, setStep] = useState(() => (params.get('step') === 'import' ? 1 : 1))
  const [repoUrl, setRepoUrl] = useState('')
  const [projectName, setProjectName] = useState('')
  const [description, setDescription] = useState('')
  const [modelId, setModelId] = useState(mockModels[0]!.id)
  const [keyMode, setKeyMode] = useState<'platform' | 'byok'>('platform')
  const [sections, setSections] = useState<Record<string, boolean>>(
    Object.fromEntries(sectionOptions.map((s) => [s, true])) as Record<string, boolean>,
  )
  const [tone, setTone] = useState('technical')
  const [badges, setBadges] = useState(true)
  const [markdown, setMarkdown] = useState(defaultMd)
  const [sectionOrder, setSectionOrder] = useState(() => parseSectionOrder(defaultMd))

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )

  const previewMd = useMemo(() => markdown, [markdown])
  const editorTheme = resolvedTheme === 'dark' ? 'vs-dark' : 'light'

  const onDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event
      if (!over || active.id === over.id) return
      const oldIndex = sectionOrder.findIndex((s) => s.id === active.id)
      const newIndex = sectionOrder.findIndex((s) => s.id === over.id)
      if (oldIndex < 0 || newIndex < 0) return
      const nextOrder = arrayMove(sectionOrder, oldIndex, newIndex)
      setSectionOrder(nextOrder)
      setMarkdown((md) => reorderMarkdownBySections(md, nextOrder))
    },
    [sectionOrder],
  )

  if (!isAuthenticated) {
    return <Navigate to="/auth" replace />
  }

  function fetchGithub() {
    if (!repoUrl.trim()) {
      toast.error('Enter a repository URL')
      return
    }
    toast.promise(
      new Promise((r) => setTimeout(r, 900)),
      {
        loading: 'Fetching repository…',
        success: 'Metadata loaded (mock) — README stub merged',
        error: 'Could not fetch',
      },
    )
    const slug = repoUrl.split('/').filter(Boolean).slice(-2).join('/') || 'demo/repo'
    setProjectName(slug)
    setDescription(`Auto-imported from ${repoUrl}`)
  }

  function onUploadJson(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      try {
        const j = JSON.parse(String(reader.result)) as { name?: string; description?: string }
        if (j.name) setProjectName(j.name)
        if (j.description) setDescription(j.description)
        toast.success(`Loaded ${file.name}`)
      } catch {
        toast.error('Could not parse JSON')
      }
    }
    reader.readAsText(file)
  }

  function runGenerate() {
    const name = projectName || 'Your project'
    const desc = description || 'Generated README outline.'
    const enabled = sectionOptions.filter((s) => sections[s])
    const body = enabled
      .map((title) => `## ${title}\n\n_Content for ${title.toLowerCase()} — edit freely._\n`)
      .join('\n')
    const badgeLine = badges
      ? '\n![CI](https://img.shields.io/badge/ci-passing-success) ![License](https://img.shields.io/badge/license-MIT-blue)\n'
      : ''
    const next = `# ${name}

> ${desc}
${badgeLine}
${body}
`
    setMarkdown(next)
    setSectionOrder(parseSectionOrder(next))
    toast.success(`Draft generated — tone: ${tone}`)
    setStep(3)
  }

  function copyMd() {
    void navigator.clipboard.writeText(markdown)
    toast.success('Markdown copied')
  }

  function downloadMd() {
    const blob = new Blob([markdown], { type: 'text/markdown' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${(projectName || 'README').replace(/\s+/g, '-')}.md`
    a.click()
    URL.revokeObjectURL(url)
    toast.success('Download started')
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <div className="mb-8 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">README generator</h1>
          <p className="text-muted-foreground text-sm">Import → configure → edit → export</p>
        </div>
        <div className="flex gap-2">
          {[1, 2, 3, 4].map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setStep(s)}
              className={cn(
                'size-8 rounded-full text-xs font-medium transition-colors',
                step === s ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-muted/80',
              )}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {step === 1 ? (
        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">GitHub repository</CardTitle>
              <CardDescription>OAuth browser and branch picker ship in production — URL fetch is mocked.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <Label htmlFor="repo">Repository URL</Label>
              <div className="flex gap-2">
                <Input
                  id="repo"
                  placeholder="https://github.com/org/repo"
                  value={repoUrl}
                  onChange={(e) => setRepoUrl(e.target.value)}
                />
                <button type="button" className={buttonVariants()} onClick={fetchGithub}>
                  Fetch
                </button>
              </div>
              <p className="text-muted-foreground text-xs">
                Detects Node, Python, Go from manifests; merges existing README when present.
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Manual project details</CardTitle>
              <CardDescription>Skip GitHub and describe the project yourself.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid gap-2">
                <Label htmlFor="pname">Name</Label>
                <Input id="pname" value={projectName} onChange={(e) => setProjectName(e.target.value)} />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="pdesc">Description</Label>
                <Input id="pdesc" value={description} onChange={(e) => setDescription(e.target.value)} />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="upload">package.json / requirements.txt</Label>
                <Input id="upload" type="file" accept=".json,.txt" onChange={onUploadJson} />
              </div>
            </CardContent>
          </Card>
          <div className="lg:col-span-2 flex justify-end">
            <button type="button" className={buttonVariants()} onClick={() => setStep(2)}>
              Continue
            </button>
          </div>
        </div>
      ) : null}

      {step === 2 ? (
        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Model & keys</CardTitle>
              <CardDescription>Platform keys on paid tiers, or bring your own.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <ModelSelector value={modelId} onChange={setModelId} />
              <RadioGroup value={keyMode} onValueChange={(v) => setKeyMode(v as 'platform' | 'byok')}>
                <div className="flex items-center gap-2">
                  <RadioGroupItem value="platform" id="km-p" />
                  <Label htmlFor="km-p">Use platform API (billing)</Label>
                </div>
                <div className="flex items-center gap-2">
                  <RadioGroupItem value="byok" id="km-b" />
                  <Label htmlFor="km-b">Use my API keys</Label>
                </div>
              </RadioGroup>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">README structure</CardTitle>
              <CardDescription>Toggle sections, tone, and shields.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-2">
                {sectionOptions.map((s) => (
                  <label key={s} className="flex items-center gap-2 text-sm">
                    <Checkbox
                      checked={sections[s]}
                      onCheckedChange={(c) => setSections((prev) => ({ ...prev, [s]: Boolean(c) }))}
                    />
                    {s}
                  </label>
                ))}
              </div>
              <div className="grid gap-2">
                <Label>Tone</Label>
                <Select value={tone} onValueChange={(v) => v && setTone(v)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="technical">Technical</SelectItem>
                    <SelectItem value="friendly">Friendly</SelectItem>
                    <SelectItem value="minimal">Minimal</SelectItem>
                    <SelectItem value="enterprise">Enterprise</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <label className="flex items-center gap-2 text-sm">
                <Checkbox checked={badges} onCheckedChange={(c) => setBadges(Boolean(c))} />
                Include default badges
              </label>
            </CardContent>
          </Card>
          <div className="lg:col-span-2 flex justify-between">
            <button type="button" className={buttonVariants({ variant: 'outline' })} onClick={() => setStep(1)}>
              Back
            </button>
            <button type="button" className={buttonVariants()} onClick={runGenerate}>
              Generate draft
            </button>
          </div>
        </div>
      ) : null}

      {step === 3 ? (
        <div className="space-y-4">
          <div className="grid min-h-[min(640px,calc(100svh-14rem))] gap-4 lg:grid-cols-2">
            <Card className="flex min-h-0 flex-col overflow-hidden">
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Editor</CardTitle>
                <CardDescription>Monaco-powered markdown</CardDescription>
              </CardHeader>
              <CardContent className="min-h-0 flex-1 p-0">
                <Editor
                  height="100%"
                  defaultLanguage="markdown"
                  theme={editorTheme}
                  value={markdown}
                  onChange={(v) => setMarkdown(v ?? '')}
                  options={{
                    minimap: { enabled: false },
                    wordWrap: 'on',
                    fontSize: 13,
                    padding: { top: 12 },
                  }}
                  className="min-h-[280px] lg:min-h-[480px]"
                />
              </CardContent>
            </Card>
            <Card className="flex min-h-0 flex-col overflow-hidden">
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Preview</CardTitle>
                <CardDescription>Rendered markdown</CardDescription>
              </CardHeader>
              <CardContent className="bg-muted/20 min-h-0 flex-1 overflow-auto p-4">
                <MarkdownPreview content={previewMd} />
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Section order</CardTitle>
              <CardDescription>Drag to reorder — updates ## headings in the document.</CardDescription>
            </CardHeader>
            <CardContent>
              <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
                <SortableContext items={sectionOrder.map((s) => s.id)} strategy={verticalListSortingStrategy}>
                  <ul className="space-y-2">
                    {sectionOrder.map((s) => (
                      <SortableRow key={s.id} id={s.id} title={s.title} />
                    ))}
                  </ul>
                </SortableContext>
              </DndContext>
            </CardContent>
          </Card>

          <div className="flex flex-wrap gap-2">
            <button type="button" className={buttonVariants({ variant: 'outline' })} onClick={copyMd}>
              Copy markdown
            </button>
            <button type="button" className={buttonVariants({ variant: 'outline' })} onClick={downloadMd}>
              Download .md
            </button>
            <button
              type="button"
              className={buttonVariants({ variant: 'secondary' })}
              onClick={() => toast.success('Saved to dashboard (mock)')}
            >
              <Save className="size-4" />
              Save
            </button>
            <button
              type="button"
              className={buttonVariants({ variant: 'secondary' })}
              onClick={() => toast.message('Share link copied (mock)', { icon: <Share2 className="size-4" /> })}
            >
              <Share2 className="size-4" />
              Share
            </button>
            <button type="button" className={buttonVariants()} onClick={() => setStep(4)}>
              Export options
            </button>
            <button type="button" className={buttonVariants({ variant: 'ghost' })} onClick={() => setStep(2)}>
              Back
            </button>
          </div>
        </div>
      ) : null}

      {step === 4 ? (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Export & integrations</CardTitle>
              <CardDescription>Push to GitHub, download alternate formats, or create a gist.</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-2">
              <button
                type="button"
                className={buttonVariants()}
                onClick={() => toast.message('GitHub OAuth commit flow (mock)')}
              >
                <Link2 className="size-4" />
                Push to GitHub
              </button>
              <button
                type="button"
                className={buttonVariants({ variant: 'outline' })}
                onClick={() => toast.success('PDF queued (mock export)')}
              >
                Download PDF
              </button>
              <button
                type="button"
                className={buttonVariants({ variant: 'outline' })}
                onClick={() => toast.success('HTML bundle ready (mock)')}
              >
                Download HTML
              </button>
              <button type="button" className={buttonVariants({ variant: 'outline' })} onClick={copyMd}>
                Copy markdown
              </button>
              <button
                type="button"
                className={buttonVariants({ variant: 'secondary' })}
                onClick={() => toast.success('Gist created (mock URL on clipboard)')}
              >
                Create GitHub Gist
              </button>
            </CardContent>
          </Card>
          <Link to="/dashboard" className={buttonVariants({ variant: 'ghost' })}>
            ← Back to dashboard
          </Link>
        </div>
      ) : null}
    </div>
  )
}

function SortableRow({ id, title }: { id: string; title: string }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id })
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }
  return (
    <li
      ref={setNodeRef}
      style={style}
      className={cn(
        'border-border bg-card flex items-center gap-2 rounded-lg border px-3 py-2 text-sm shadow-sm',
        isDragging && 'opacity-80 ring-2 ring-primary/30',
      )}
    >
      <button
        type="button"
        className="text-muted-foreground hover:text-foreground cursor-grab touch-none"
        {...attributes}
        {...listeners}
      >
        <GripVertical className="size-4" />
      </button>
      {title}
    </li>
  )
}
