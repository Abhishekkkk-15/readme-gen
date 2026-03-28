import { Search, Filter, Layers, FileCode2, Zap, LayoutTemplate } from 'lucide-react'
import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { readmeTemplates, type ReadmeTemplateWithBody } from '@/data/templates'
import { stashDraftForEditor } from '@/lib/snapshot-storage'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { MarkdownPreview } from '@/components/markdown-preview'

type LayoutCategory = ReadmeTemplateWithBody['category'] | 'all'

const categoryIcons: Record<ReadmeTemplateWithBody['category'], React.ReactNode> = {
  backend: <LayoutTemplate className="size-4" />,
  frontend: <LayoutTemplate className="size-4" />,
  library: <FileCode2 className="size-4" />,
  ml: <Layers className="size-4" />,
  cli: <Zap className="size-4" />,
  mobile: <LayoutTemplate className="size-4" />,
  internal: <Layers className="size-4" />,
}

export function TemplatesPage() {
  const navigate = useNavigate()
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState<LayoutCategory>('all')
  const [previewId, setPreviewId] = useState<string | null>(null)

  const filtered = useMemo(() => {
    return readmeTemplates.filter((t) => {
      const matchSearch = t.name.toLowerCase().includes(search.toLowerCase()) || 
                          t.description.toLowerCase().includes(search.toLowerCase()) ||
                          t.tags.some(tag => tag.toLowerCase().includes(search.toLowerCase()))
      const matchCat = category === 'all' || t.category === category
      return matchSearch && matchCat
    })
  }, [search, category])

  const previewTemplate = previewId ? readmeTemplates.find(t => t.id === previewId) : null

  function applyTemplate(t: ReadmeTemplateWithBody) {
    // Stash the full generated body and jump to the editor step
    const defaultBody = t.body
      .replace(/\{project-name\}/g, t.name)
      .replace(/\{description\}/g, t.description)
      .replace(/\{year\}/g, new Date().getFullYear().toString())
      .replace(/\{author\}/g, 'Your Name')

    stashDraftForEditor(defaultBody, [])
    navigate('/generate?step=3&restored=1')
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Templates</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Curated README blueprints for any project type.
          </p>
        </div>
      </div>

      <div className="mb-6 flex flex-col gap-4 sm:flex-row">
        <div className="relative flex-1 max-w-sm">
          <Search className="text-muted-foreground absolute left-3 top-1/2 size-4 -translate-y-1/2" />
          <Input 
            placeholder="Search templates, tags..." 
            className="pl-9" 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-2">
          <Select value={category} onValueChange={(v) => setCategory(v as LayoutCategory)}>
            <SelectTrigger className="w-[180px]">
              <div className="flex items-center gap-2">
                <Filter className="size-4 text-muted-foreground" />
                <SelectValue placeholder="All categories" />
              </div>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All categories</SelectItem>
              <SelectItem value="frontend">Frontend & Web</SelectItem>
              <SelectItem value="backend">Backend & API</SelectItem>
              <SelectItem value="library">Libraries & OSS</SelectItem>
              <SelectItem value="cli">CLI Tools</SelectItem>
              <SelectItem value="mobile">Mobile Apps</SelectItem>
              <SelectItem value="ml">Data & ML</SelectItem>
              <SelectItem value="internal">Internal Platform</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {filtered.map((t) => (
          <Card key={t.id} className="flex flex-col group hover:border-primary/50 transition-colors">
            <CardHeader className="pb-3 flex-1">
              <div className="mb-3 inline-flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                {categoryIcons[t.category] || <LayoutTemplate className="size-5" />}
              </div>
              <CardTitle className="text-lg">{t.name}</CardTitle>
              <CardDescription className="line-clamp-2 mt-1 min-h-[40px]">
                {t.description}
              </CardDescription>
              <div className="mt-4 flex flex-wrap gap-1.5">
                {t.tags.slice(0, 3).map((tag) => (
                  <Badge key={tag} variant="secondary" className="font-normal text-xs px-2 py-0">
                    {tag}
                  </Badge>
                ))}
              </div>
            </CardHeader>
            <CardFooter className="pt-3 gap-2 border-t mt-auto">
              <Button 
                variant="outline" 
                className="w-full flex-1" 
                onClick={() => setPreviewId(t.id)}
              >
                Preview
              </Button>
              <Button 
                className="flex-1"
                onClick={() => applyTemplate(t)}
              >
                Use layout
              </Button>
            </CardFooter>
          </Card>
        ))}
      </div>
      
      {filtered.length === 0 && (
        <div className="py-20 text-center">
          <LayoutTemplate className="mx-auto size-12 text-muted-foreground/30 mb-4" />
          <h3 className="text-lg font-medium">No templates found</h3>
          <p className="text-muted-foreground mt-1">Try adjusting your search terms or filters.</p>
          <Button variant="outline" className="mt-4" onClick={() => { setSearch(''); setCategory('all') }}>
            Clear filters
          </Button>
        </div>
      )}

      {/* Preview Modal */}
      <Dialog open={!!previewId} onOpenChange={(open) => !open && setPreviewId(null)}>
        <DialogContent className="max-w-6xl max-h-[90vh] flex flex-col p-0 gap-0 overflow-hidden">
          <div className="border-b p-6 pb-4 shrink-0">
            <DialogHeader>
              <div className="flex items-center justify-between pr-6">
                <div>
                  <DialogTitle className="text-xl flex items-center gap-2">
                    {previewTemplate?.name}
                    <Badge variant="outline" className="ml-2 font-normal text-xs">Category: {previewTemplate?.category}</Badge>
                  </DialogTitle>
                  <DialogDescription className="mt-1">
                    {previewTemplate?.description}
                  </DialogDescription>
                </div>
                <Button 
                  size="sm"
                  onClick={() => previewTemplate && applyTemplate(previewTemplate)}
                >
                  Use template
                </Button>
              </div>
            </DialogHeader>
          </div>
          
          <div className="flex-1 overflow-y-auto bg-muted/20 p-6">
            {previewTemplate && (
              <div className="max-w-3xl mx-auto rounded-lg border bg-card p-4 sm:p-8 shadow-sm">
                <MarkdownPreview content={previewTemplate.body.replace(/\{project-name\}/g, previewTemplate.name).replace(/\{description\}/g, previewTemplate.description).replace(/\{year\}/g, new Date().getFullYear().toString()).replace(/\{author\}/g, 'Your Name')} />
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
