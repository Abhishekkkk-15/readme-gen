import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { Filter, FlaskConical, Table2 } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useMemo, useState } from 'react'
import { toast } from 'sonner'

import { ApiKeyManager } from '@/components/api-key-manager'
import { ModelSelector } from '@/components/model-selector'
import { Badge } from '@/components/ui/badge'
import { Button, buttonVariants } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { mockModels } from '@/data/mock'
import type { Model } from '@/types'
import { cn } from '@/lib/utils'

const providers = ['All', 'OpenAI', 'Gemini', 'Groq'] as const

async function fetchModels(): Promise<Model[]> {
  await new Promise((r) => setTimeout(r, 400))
  return mockModels
}

function getProviderForModel(model: Model): 'OpenAI' | 'Gemini' | 'Groq' {
  return model.provider as 'OpenAI' | 'Gemini' | 'Groq'
}

export function ModelsPage() {
  const [filter, setFilter] = useState<string>('All')
  const [q, setQ] = useState('')
  const [testKey, setTestKey] = useState('')
  const [genModel, setGenModel] = useState(mockModels[0]!.id)
  const [isKeyDialogOpen, setIsKeyDialogOpen] = useState(false)
  const [selectedProvider, setSelectedProvider] = useState<'OpenAI' | 'Gemini' | 'Groq'>('OpenAI')

  const { data: models = mockModels, isFetching } = useQuery({
    queryKey: ['models'],
    queryFn: fetchModels,
  })

  const filtered = useMemo(() => {
    return models.filter((m) => {
      const byProvider = filter === 'All' || m.provider === filter
      const byQ =
        !q.trim() ||
        m.name.toLowerCase().includes(q.toLowerCase()) ||
        m.provider.toLowerCase().includes(q.toLowerCase())
      return byProvider && byQ
    })
  }, [models, filter, q])

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <div className="max-w-2xl">
        <h1 className="text-3xl font-semibold tracking-tight">AI models</h1>
        <p className="text-muted-foreground mt-2 text-sm sm:text-base">
          Compare hosted and bring-your-own options. Pricing shown per 1M tokens (USD) where applicable.
        </p>
      </div>

      <div className="mt-8 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="flex flex-1 flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative max-w-md flex-1">
            <Filter className="text-muted-foreground absolute top-1/2 left-2.5 size-4 -translate-y-1/2" />
            <Input
              placeholder="Search models…"
              className="ps-9"
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
          </div>
          <ScrollArea className="w-full sm:max-w-xl">
            <div className="flex gap-2 pb-2">
              {providers.map((p) => (
                <Button
                  key={p}
                  type="button"
                  size="sm"
                  variant={filter === p ? 'default' : 'outline'}
                  onClick={() => setFilter(p)}
                >
                  {p}
                </Button>
              ))}
            </div>
            <ScrollBar orientation="horizontal" />
          </ScrollArea>
        </div>
        {isFetching ? <span className="text-muted-foreground text-xs">Refreshing…</span> : null}
      </div>

      <div className="mt-10 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {filtered.map((m, i) => (
          <motion.div
            key={m.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.03 }}
          >
            <Card className="h-full border-border/80 transition-shadow hover:shadow-md">
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <CardTitle className="text-base">{m.name}</CardTitle>
                    <CardDescription>{m.provider}</CardDescription>
                  </div>
                  {m.recommended ? <Badge>Recommended</Badge> : null}
                </div>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div className="text-muted-foreground flex flex-wrap gap-2 text-xs">
                  <Badge variant="outline">{(m.contextLength / 1000).toFixed(0)}k context</Badge>
                  <Badge variant="outline">
                    ${m.pricing.input} in / ${m.pricing.output} out
                  </Badge>
                  {typeof m.performanceScore === 'number' ? (
                    <Badge variant="secondary">Score {m.performanceScore}</Badge>
                  ) : null}
                </div>
                <p className="text-muted-foreground text-xs">{m.capabilities.join(' · ')}</p>
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  className="w-full"
                  onClick={() => {
                    setSelectedProvider(getProviderForModel(m))
                    setIsKeyDialogOpen(true)
                  }}
                >
                  Try with your API key
                </Button>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {filtered.length === 0 ? (
        <p className="text-muted-foreground mt-12 text-center text-sm">No models match your filters.</p>
      ) : null}

      <section className="mt-20 space-y-4">
        <div className="flex items-center gap-2">
          <Table2 className="size-5" />
          <h2 className="text-xl font-semibold tracking-tight">Comparison</h2>
        </div>
        <div className="border-border rounded-xl border">
          <ScrollArea className="h-[min(420px,60vh)] w-full">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Model</TableHead>
                  <TableHead>Provider</TableHead>
                  <TableHead>Context</TableHead>
                  <TableHead>In $/1M</TableHead>
                  <TableHead>Out $/1M</TableHead>
                  <TableHead>Score</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {models.map((m) => (
                  <TableRow key={m.id}>
                    <TableCell className="font-medium">{m.name}</TableCell>
                    <TableCell>{m.provider}</TableCell>
                    <TableCell>{m.contextLength.toLocaleString()}</TableCell>
                    <TableCell>{m.pricing.input}</TableCell>
                    <TableCell>{m.pricing.output}</TableCell>
                    <TableCell>{m.performanceScore ?? '—'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </ScrollArea>
        </div>
      </section>

      <section className="mt-16 grid gap-8 lg:grid-cols-2">
        <ApiKeyManager
          hideTrigger
          open={isKeyDialogOpen}
          onOpenChange={setIsKeyDialogOpen}
          initialProvider={selectedProvider}
        />
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <FlaskConical className="size-4" />
              API key testing
            </CardTitle>
            <CardDescription>Paste a key — we only simulate a handshake in this UI.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid gap-2">
              <Label htmlFor="test-key">Secret</Label>
              <Input
                id="test-key"
                type="password"
                value={testKey}
                onChange={(e) => setTestKey(e.target.value)}
                placeholder="sk-…"
              />
            </div>
            <Button
              type="button"
              onClick={() => {
                if (!testKey.trim()) {
                  toast.error('Enter a key to test')
                  return
                }
                toast.promise(new Promise((r) => setTimeout(r, 800)), {
                  loading: 'Calling provider…',
                  success: 'Key accepted (mock)',
                  error: 'Failed',
                })
              }}
            >
              Test key
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Model for next generation</CardTitle>
            <CardDescription>Reuses the same selector as the generator wizard.</CardDescription>
          </CardHeader>
          <CardContent>
            <ModelSelector value={genModel} onChange={setGenModel} />
            <Link to="/generate" className={cn(buttonVariants(), 'mt-4 inline-flex w-full justify-center')}>
              Open generator
            </Link>
          </CardContent>
        </Card>
      </section>
    </div>
  )
}
