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
import { GripVertical, Link2, Save, Sparkles, Languages, History, Check, X, Bold, Italic, Strikethrough, Link as LinkIcon, List, ListOrdered, Quote, Code, Heading, Columns, Copy, Expand, Laptop } from 'lucide-react'
import { useCallback, useEffect, useMemo, useState, useRef } from 'react'
import { Link, Navigate, useSearchParams } from 'react-router-dom'
import { toast } from 'sonner'

import { MarkdownDiff } from '@/components/markdown-diff'
import { MarkdownPreview } from '@/components/markdown-preview'
import { ModelSelector } from '@/components/model-selector'
import { QualityInsights } from '@/components/quality-insights'
import { buttonVariants, Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card'
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useAuth } from '@/contexts/auth-context'
import { useWorkspace } from '@/contexts/workspace-context'
import { mockModels } from '@/data/mock'
import { getSectionSuggestions } from '@/lib/section-suggestions'
import { consumeDraftRestore } from '@/lib/snapshot-storage'
import { useReadmeHistory } from '@/hooks/use-readme-history'
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

const languages = [
  { value: 'en', label: 'English' },
  { value: 'zh', label: 'Chinese (Simplified)' },
  { value: 'es', label: 'Spanish' },
  { value: 'fr', label: 'French' },
  { value: 'ja', label: 'Japanese' },
  { value: 'pt', label: 'Portuguese' },
]

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
  const { activeWorkspace } = useWorkspace()
  const [params] = useSearchParams()
  const { resolvedTheme } = useTheme()

  const { history, saveSnapshot } = useReadmeHistory(activeWorkspace.id)

  const [step, setStep] = useState(() => {
    if (params.get('restored') === '1') return 3
    if (params.get('step') === 'import') return 1
    return 1
  })

  // Start checking for restored draft immediately on mount
  useEffect(() => {
    const draft = consumeDraftRestore()
    if (draft && draft.content) {
      setMarkdown(draft.content)
      setSectionOrder(parseSectionOrder(draft.content))
      toast.success('Template loaded!')
    }
  }, [])

  const [repoUrl, setRepoUrl] = useState('')
  const [projectName, setProjectName] = useState('')
  const [description, setDescription] = useState('')
  const [modelId, setModelId] = useState(mockModels[0]!.id)
  const [keyMode, setKeyMode] = useState<'platform' | 'byok'>('platform')
  const [sections, setSections] = useState<Record<string, boolean>>(
    Object.fromEntries(sectionOptions.map((s) => [s, true])) as Record<string, boolean>,
  )
  const [customSections, setCustomSections] = useState<Record<string, string>>({})
  const [tone, setTone] = useState('technical')
  const [badges, setBadges] = useState(true)
  
  const [markdown, setMarkdown] = useState(defaultMd)
  const [sectionOrder, setSectionOrder] = useState(() => parseSectionOrder(defaultMd))
  
  const [diffTarget, setDiffTarget] = useState<string | null>(null)
  const [targetLang, setTargetLang] = useState('en')
  const [isTranslating, setIsTranslating] = useState(false)

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )

  const previewMd = useMemo(() => markdown, [markdown])
  const editorTheme = resolvedTheme === 'dark' ? 'vs-dark' : 'light'

  const editorRef = useRef<any>(null)
  const [layoutMode, setLayoutMode] = useState<'split' | 'editor' | 'preview'>('split')
  const [isImproving, setIsImproving] = useState(false)

  function handleEditorDidMount(editor: any) {
    editorRef.current = editor
  }

  function applyFormat(format: string) {
    const editor = editorRef.current
    if (!editor) return
    const selection = editor.getSelection()
    if (!selection) return
    const model = editor.getModel()
    if (!model) return

    let text = model.getValueInRange(selection)
    let newText = text

    let pre = ''
    let post = ''
    
    switch (format) {
      case 'bold': pre = '**'; post = '**'; break
      case 'italic': pre = '*'; post = '*'; break
      case 'strike': pre = '~~'; post = '~~'; break
      case 'code': pre = '\`'; post = '\`'; break
      case 'quote': pre = '> '; post = ''; break
      case 'h2': pre = '## '; post = ''; break
      case 'link': pre = '['; post = '](url)'; break
      case 'ul': pre = '- '; post = ''; break
      case 'ol': pre = '1. '; post = ''; break
      default: return
    }
    
    if (['bold', 'italic', 'strike', 'code'].includes(format)) {
      if (!text) text = format
      // Toggle if already completely wrapped
      if (text.startsWith(pre) && text.endsWith(post) && text.length > pre.length + post.length) {
        newText = text.slice(pre.length, text.length - post.length)
      } else {
        newText = `${pre}${text}${post}`
      }
    } else if (['link'].includes(format)) {
      if (!text) text = 'link text'
      newText = `${pre}${text}${post}`
    } else {
      // Line prefixes
      const lines = text ? text.split('\n') : ['']
      newText = lines.map((l: string, i: number) => {
        if (format === 'ol') return `${i + 1}. ${l}`
        return `${pre}${l}`
      }).join('\n')
    }

    editor.executeEdits('formatting', [{
      range: selection,
      text: newText,
      forceMoveMarkers: true
    }])
    editor.focus()
  }

  async function improveWithAI() {
    const editor = editorRef.current
    if (!editor) return
    const selection = editor.getSelection()
    if (!selection) return
    const model = editor.getModel()
    if (!model) return

    const text = model.getValueInRange(selection)
    if (!text || text.trim().length === 0) {
      toast.error('Please select some text to improve first.')
      return
    }

    setIsImproving(true)
    
    // Mock AI delay
    toast.promise(
      new Promise(resolve => setTimeout(resolve, 1500)),
      {
        loading: 'AI is improving your text...',
        success: () => {
          const improvedText = text
            .split('\n')
            .map((line: string) => line.trim() ? `${line} (improved by AI ✨)` : line)
            .join('\n')
            
          editor.executeEdits('ai-improve', [{
            range: selection,
            text: improvedText,
            forceMoveMarkers: true
          }])
          editor.focus()
          setIsImproving(false)
          return 'Text improved successfully!'
        },
        error: () => {
          setIsImproving(false)
          return 'Failed to improve text.'
        }
      }
    )
  }

  // Smart suggestions logic
  const suggestions = useMemo(() => {
    return getSectionSuggestions(projectName, description)
  }, [projectName, description])

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

  function addCustomSection(heading: string, bodyContent: string) {
    if (!sections[heading]) {
      setSections(prev => ({ ...prev, [heading]: true }))
      setCustomSections(prev => ({ ...prev, [heading]: bodyContent }))
      toast.success(`Added ${heading} section`)
    }
  }

  function runGenerate() {
    const name = projectName || 'Your project'
    const desc = description || 'Generated README outline.'
    
    // Core features
    const enabledStr = Object.keys(sections).filter((s) => sections[s])
    
    const body = enabledStr
      .map((title) => {
        if (customSections[title]) return customSections[title]!
        return `## ${title}\n\n_Content for ${title.toLowerCase()} — edit freely._\n`
      })
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
  
  function saveWork() {
    const name = projectName || 'Untitled README'
    saveSnapshot(markdown, name, modelId)
    toast.success('Version saved to history')
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
    a.download = `${(projectName || 'README').replace(/\s+/g, '-')}${targetLang !== 'en' ? `.${targetLang}` : ''}.md`
    a.click()
    URL.revokeObjectURL(url)
    toast.success('Download started')
  }
  
  function simulateTranslate(lang: string) {
    if (lang === targetLang) return
    setTargetLang(lang)
    
    if (lang === 'en') {
      toast.success('Reverted to English')
      return
    }
    
    setIsTranslating(true)
    toast.promise(
      new Promise(r => setTimeout(r, 1500)),
      {
        loading: `Translating to ${lang.toUpperCase()}...`,
        success: () => {
          setIsTranslating(false)
          return `Mock translation complete (prepended language flag)`
        },
        error: () => {
          setIsTranslating(false)
          return 'Translation failed'
        }
      }
    )
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
          <div className="lg:col-span-2 flex justify-between">
            <Link to="/templates" className={buttonVariants({ variant: 'outline' })}>
              Browse templates instead
            </Link>
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
          
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">README structure</CardTitle>
                <CardDescription>Toggle sections, tone, and shields.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-2">
                  {Object.keys(sections).map((s) => (
                    <label key={s} className="flex items-center gap-2 text-sm">
                      <Checkbox
                        checked={sections[s]}
                        onCheckedChange={(c) => setSections((prev) => ({ ...prev, [s]: Boolean(c) }))}
                      />
                      {s}
                    </label>
                  ))}
                </div>
                
                {suggestions.length > 0 && (
                  <div className="bg-muted/30 p-3 rounded-lg border border-border/50">
                    <p className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5 mb-2">
                      <Sparkles className="size-3 text-primary" />
                      Suggested for {projectName || 'this project'}
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {suggestions.map((s) => (
                        <button
                          key={s.heading}
                          disabled={sections[s.heading]}
                          className={cn(
                            "text-xs px-2.5 py-1 rounded-md border text-left transition-colors",
                            sections[s.heading] ? "opacity-50 cursor-not-allowed bg-muted" : "bg-background hover:bg-accent hover:border-accent-foreground/20"
                          )}
                          onClick={() => addCustomSection(s.heading, s.body)}
                        >
                          {sections[s.heading] && <Check className="size-3 inline mr-1" />}
                          {s.label}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                
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
          </div>
          
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
          <Tabs defaultValue="editor" className="w-full">
            <div className="flex justify-between items-center mb-4">
              <TabsList>
                <TabsTrigger value="editor">Editor & Preview</TabsTrigger>
                <TabsTrigger value="insights">Quality & Structure</TabsTrigger>
                <TabsTrigger value="history" className="gap-2">
                  <History className="size-3.5" />
                  Version History
                </TabsTrigger>
              </TabsList>
              
              <div className="flex gap-2">
                <Button variant="secondary" onClick={saveWork}>
                  <Save className="size-4 mr-2" />
                  Save Version
                </Button>
                <Button onClick={() => setStep(4)}>
                  Export options
                </Button>
              </div>
            </div>

            <TabsContent value="editor" className="mt-0">
              <div className={cn("grid min-h-[min(640px,calc(100svh-14rem))] gap-4", 
                layoutMode === 'split' ? "lg:grid-cols-2" : "grid-cols-1"
              )}>
                {layoutMode !== 'preview' && (
                  <Card className="flex min-h-0 flex-col overflow-hidden">
                    <CardHeader className="p-2 border-b bg-muted/40 flex flex-row items-center justify-between">
                      <div className="flex flex-wrap gap-1 items-center overflow-x-auto">
                        <Button 
                          variant="secondary" 
                          size="sm" 
                          className="h-8 gap-1.5 mr-2 bg-primary/10 text-primary hover:bg-primary/20" 
                          onClick={improveWithAI}
                          disabled={isImproving}
                        >
                          <Sparkles className={cn("size-3.5", isImproving && "animate-pulse")} />
                          {isImproving ? "Improving..." : "AI Improve"}
                        </Button>
                        <div className="w-px h-4 bg-border mr-1" />
                        
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => applyFormat('bold')}><Bold className="size-4" /></Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => applyFormat('italic')}><Italic className="size-4" /></Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => applyFormat('strike')}><Strikethrough className="size-4" /></Button>
                        <div className="w-px h-4 bg-border mx-1" />
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => applyFormat('h2')}><Heading className="size-4" /></Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => applyFormat('quote')}><Quote className="size-4" /></Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => applyFormat('code')}><Code className="size-4" /></Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => applyFormat('link')}><LinkIcon className="size-4" /></Button>
                        <div className="w-px h-4 bg-border mx-1" />
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => applyFormat('ul')}><List className="size-4" /></Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => applyFormat('ol')}><ListOrdered className="size-4" /></Button>
                      </div>
                      
                      <div className="flex gap-1 shrink-0">
                        <Button 
                          variant={layoutMode === 'editor' ? 'secondary' : 'ghost'} 
                          size="icon" className="h-8 w-8 text-muted-foreground" 
                          onClick={() => setLayoutMode('editor')}
                          title="Editor only"
                        >
                          <Expand className="size-4" />
                        </Button>
                        <Button 
                          variant={layoutMode === 'split' ? 'secondary' : 'ghost'} 
                          size="icon" className="h-8 w-8 text-muted-foreground" 
                          onClick={() => setLayoutMode('split')}
                          title="Split view"
                        >
                          <Columns className="size-4" />
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent className="min-h-0 flex-1 p-0">
                      <Editor
                        onMount={handleEditorDidMount}
                        height="100%"
                        defaultLanguage="markdown"
                        theme={editorTheme}
                        value={markdown}
                        onChange={(v) => {
                          setMarkdown(v ?? '')
                          // Attempt to update structure as you type
                          if (v && Math.random() > 0.8) {
                             setSectionOrder(parseSectionOrder(v))
                          }
                        }}
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
                )}
                {layoutMode !== 'editor' && (
                  <Card className="flex min-h-0 flex-col overflow-hidden">
                    <CardHeader className="p-2 border-b bg-muted/40 flex flex-row items-center justify-between">
                      <div className="text-sm font-medium px-4 py-1 flex items-center gap-2">
                        <Laptop className="size-4 text-muted-foreground" />
                        {layoutMode === 'preview' ? 'Preview Mode' : 'Live Preview'}
                      </div>
                      <div className="flex gap-1 shrink-0 pr-2">
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground" onClick={copyMd} title="Copy markdown">
                          <Copy className="size-4" />
                        </Button>
                        <Button 
                          variant={layoutMode === 'preview' ? 'secondary' : 'ghost'} 
                          size="icon" className="h-8 w-8 text-muted-foreground" 
                          onClick={() => setLayoutMode('preview')}
                          title="Preview only"
                        >
                          <Expand className="size-4" />
                        </Button>
                        {layoutMode === 'preview' && (
                          <Button 
                            variant="ghost" 
                            size="icon" className="h-8 w-8 text-muted-foreground" 
                            onClick={() => setLayoutMode('split')}
                            title="Split view"
                          >
                            <Columns className="size-4" />
                          </Button>
                        )}
                      </div>
                    </CardHeader>
                    <CardContent className={cn("bg-muted/10 min-h-0 flex-1 overflow-auto", layoutMode === 'preview' ? 'p-8 md:p-12 lg:p-16' : 'p-4')}>
                      <div className={cn("mx-auto rounded-xl bg-card shadow-sm p-8", layoutMode === 'preview' ? 'max-w-5xl border-y border-x' : '')}>
                        <MarkdownPreview content={previewMd} />
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            </TabsContent>

            <TabsContent value="insights" className="mt-0">
              <div className="grid lg:grid-cols-2 gap-4 items-start">
                <QualityInsights 
                  markdown={markdown}
                  onFix={(fixed) => {
                    setMarkdown(fixed)
                    toast.success("Applied fix")
                  }} 
                />
                
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
              </div>
            </TabsContent>

            <TabsContent value="history" className="mt-0">
              <div className="grid lg:grid-cols-3 gap-6">
                <Card className="lg:col-span-1 h-[600px] flex flex-col">
                  <CardHeader>
                    <CardTitle className="text-base">Saved Snapshots</CardTitle>
                    <CardDescription>Click to compare with current editor.</CardDescription>
                  </CardHeader>
                  <CardContent className="flex-1 overflow-y-auto p-0">
                    <div className="divide-y">
                      {history.length === 0 ? (
                        <div className="p-8 text-center text-muted-foreground text-sm">
                          No history. Click "Save Version" to create a snapshot.
                        </div>
                      ) : history.map(h => (
                        <div 
                          key={h.id} 
                          className={cn(
                            "p-4 hover:bg-muted/50 cursor-pointer transition-colors flex justify-between items-center group",
                            diffTarget === h.id ? "bg-accent border-l-2 border-primary" : ""
                          )}
                          onClick={() => setDiffTarget(h.id)}
                        >
                          <div>
                            <p className="font-medium text-sm">{h.name}</p>
                            <p className="text-xs text-muted-foreground mt-1">
                              {new Date(h.createdAt).toLocaleString()}
                            </p>
                          </div>
                          {diffTarget === h.id && (
                            <Button 
                              variant="outline" 
                              size="sm" 
                              className="h-7 text-xs"
                              onClick={(e) => {
                                e.stopPropagation();
                                setMarkdown(h.content);
                                toast.success("Restored from history");
                              }}
                            >
                              Restore
                            </Button>
                          )}
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
                
                <div className="lg:col-span-2">
                  {diffTarget ? (
                    <Card className="h-full">
                      <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <div>
                          <CardTitle className="text-base">Diff Viewer</CardTitle>
                          <CardDescription>Comparing current editor to snapshot</CardDescription>
                        </div>
                        <Button variant="ghost" size="icon" onClick={() => setDiffTarget(null)}>
                          <X className="size-4" />
                        </Button>
                      </CardHeader>
                      <CardContent>
                        <MarkdownDiff
                          className="h-[500px]"
                          before={history.find(h => h.id === diffTarget)?.content || ''}
                          after={markdown}
                        />
                      </CardContent>
                    </Card>
                  ) : (
                    <div className="h-full border border-dashed rounded-lg flex flex-col items-center justify-center text-muted-foreground p-10">
                      <History className="size-10 opacity-20 mb-4" />
                      <p>Select a snapshot from the sidebar to view diffs</p>
                    </div>
                  )}
                </div>
              </div>
            </TabsContent>
          </Tabs>

        </div>
      ) : null}

      {step === 4 ? (
        <div className="grid lg:grid-cols-2 gap-6">
          <Card className="lg:row-span-2 flex flex-col">
            <CardHeader className="pb-3 border-b">
              <div className="flex justify-between items-center">
                <CardTitle className="text-base">Localization</CardTitle>
                <Languages className="size-5 text-muted-foreground" />
              </div>
            </CardHeader>
            <CardContent className="p-0">
               <div className="flex flex-col">
                {languages.map(lang => (
                  <button
                    key={lang.value}
                    onClick={() => simulateTranslate(lang.value)}
                    className={cn(
                      "flex items-center justify-between p-4 border-b hover:bg-muted/50 transition-colors text-left",
                      targetLang === lang.value && "bg-primary/5 text-primary border-l-2 border-l-primary"
                    )}
                  >
                    <div>
                      <p className="font-medium text-sm">{lang.label}</p>
                      <p className="text-xs text-muted-foreground">{lang.value.toUpperCase()}</p>
                    </div>
                    {targetLang === lang.value && !isTranslating && <Check className="size-4" />}
                    {targetLang === lang.value && isTranslating && <span className="text-xs animate-pulse">Translating...</span>}
                  </button>
                ))}
              </div>
            </CardContent>
            <CardFooter className="pt-4 border-t bg-muted/20 mt-auto">
              <p className="text-xs text-muted-foreground">
                Translating invokes your selected API model again and will consume tokens.
              </p>
            </CardFooter>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Export options</CardTitle>
              <CardDescription>
                {targetLang === 'en' ? 'Standard English export.' : `Exporting ${targetLang.toUpperCase()} localized version.`}
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
              <Button
                variant="default"
                className="justify-start shadow-sm"
                onClick={() => toast.message('GitHub OAuth commit flow (mock)')}
                disabled={isTranslating}
              >
                <Link2 className="size-4 mr-2" />
                Push to GitHub
              </Button>
              <Button
                variant="outline"
                className="justify-start shadow-sm"
                onClick={downloadMd}
                disabled={isTranslating}
              >
                Download Markdown (.md)
              </Button>
              <Button
                variant="outline"
                className="justify-start shadow-sm flex gap-2"
                onClick={copyMd}
                disabled={isTranslating}
              >
                Copy to clipboard
              </Button>
            </CardContent>
          </Card>
          
          <div className="flex justify-start">
             <Button variant="ghost" onClick={() => setStep(3)}>
                ← Back to editor
             </Button>
          </div>
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
