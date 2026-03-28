import { Search, Video } from 'lucide-react'
import { useMemo, useState } from 'react'

import { CodeSnippet } from '@/components/code-snippet'
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { cn } from '@/lib/utils'

const sections = [
  { id: 'getting-started', title: 'Getting started' },
  { id: 'cli-installation', title: 'CLI installation' },
  { id: 'web-guide', title: 'Web interface' },
  { id: 'api-keys', title: 'API keys setup' },
  { id: 'models', title: 'Supported models' },
  { id: 'pricing', title: 'Pricing & plans' },
  { id: 'faq', title: 'FAQ' },
]

export function DocsPage() {
  const [q, setQ] = useState('')
  const filtered = useMemo(
    () => sections.filter((s) => s.title.toLowerCase().includes(q.trim().toLowerCase())),
    [q],
  )

  return (
    <div className="mx-auto flex min-h-[calc(100svh-3.5rem)] max-w-6xl gap-8 px-4 py-10 sm:px-6">
      <aside className="hidden w-56 shrink-0 lg:block">
        <div className="sticky top-20 space-y-4">
          <p className="text-muted-foreground text-xs font-semibold tracking-wide uppercase">On this page</p>
          <ScrollArea className="h-[calc(100svh-8rem)]">
            <nav className="flex flex-col gap-1 pr-3">
              {filtered.map((s) => (
                <a
                  key={s.id}
                  href={`#${s.id}`}
                  className="text-muted-foreground hover:text-foreground rounded-md px-2 py-1.5 text-sm transition-colors"
                >
                  {s.title}
                </a>
              ))}
            </nav>
          </ScrollArea>
        </div>
      </aside>

      <div className="min-w-0 flex-1">
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight">Documentation</h1>
            <p className="text-muted-foreground mt-1 text-sm">
              Web app, CLI, and API keys — everything in one place.
            </p>
          </div>
          <div className="relative max-w-sm flex-1 sm:max-w-xs">
            <Search className="text-muted-foreground absolute top-1/2 left-2.5 size-4 -translate-y-1/2" />
            <Input
              placeholder="Search sections…"
              className="ps-9"
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
          </div>
        </div>

        <div className="space-y-16">
          <section id="getting-started" className="scroll-mt-24">
            <h2 className="text-2xl font-semibold tracking-tight">Getting started</h2>
            <p className="text-muted-foreground mt-2 max-w-2xl text-sm leading-relaxed">
              ReadMe Studio generates structured README.md files from your repository metadata, optional
              uploads, and AI models you choose — hosted keys or your own.
            </p>
            <Card className="mt-6">
              <CardHeader>
                <CardTitle className="text-base">Quick start</CardTitle>
                <CardDescription>Three paths into the same generation engine.</CardDescription>
              </CardHeader>
              <CardContent className="grid gap-4 sm:grid-cols-3">
                {[
                  { t: 'Web', d: 'Use the guided wizard with live preview.', href: '/generate' },
                  { t: 'CLI', d: 'Run locally or in CI with the same templates.', href: '#cli-installation' },
                  { t: 'API', d: 'Call our REST API on Pro+ (mock in this demo).', href: '/pricing' },
                ].map((x) => (
                  <a
                    key={x.t}
                    href={x.href}
                    className="border-border bg-muted/40 hover:border-primary/40 rounded-xl border p-4 transition-colors"
                  >
                    <p className="font-medium">{x.t}</p>
                    <p className="text-muted-foreground mt-1 text-xs">{x.d}</p>
                  </a>
                ))}
              </CardContent>
            </Card>
          </section>

          <section id="cli-installation" className="scroll-mt-24">
            <h2 className="text-2xl font-semibold tracking-tight">CLI installation</h2>
            <p className="text-muted-foreground mt-2 text-sm">
              Install the CLI with your preferred package manager or download a binary.
            </p>
            <div className="mt-6 space-y-4">
              <CodeSnippet title="npm" language="bash" code="npm install -g @readme-studio/cli" />
              <CodeSnippet title="yarn" language="bash" code="yarn global add @readme-studio/cli" />
              <CodeSnippet title="pnpm" language="bash" code="pnpm add -g @readme-studio/cli" />
              <CodeSnippet title="Homebrew" language="bash" code="brew install readme-studio/tap/readme-studio" />
              <CodeSnippet
                title="Manual"
                language="bash"
                code={`curl -fsSL https://readme.studio/install.sh | bash
readme-studio --version`}
              />
            </div>
            <Card className="mt-6">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Video className="size-4" />
                  Video walkthrough
                </CardTitle>
                <CardDescription>Placeholder — drop in your Loom or YouTube embed.</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="bg-muted text-muted-foreground flex aspect-video items-center justify-center rounded-lg border border-dashed text-sm">
                  Video embed area
                </div>
              </CardContent>
            </Card>
            <p className="text-muted-foreground mt-4 text-sm">
              Try an interactive dry-run (no network in this demo):
            </p>
            <CliPlayground />
          </section>

          <section id="web-guide" className="scroll-mt-24">
            <h2 className="text-2xl font-semibold tracking-tight">Web interface guide</h2>
            <ul className="text-muted-foreground mt-4 list-inside list-disc space-y-2 text-sm">
              <li>Import from GitHub URL or paste project details manually.</li>
              <li>Upload <code className="bg-muted rounded px-1">package.json</code> or requirements for smarter defaults.</li>
              <li>Pick model, tone, sections, and badges before generation.</li>
              <li>Edit in split view, reorder sections, then export or save to your dashboard.</li>
            </ul>
          </section>

          <section id="api-keys" className="scroll-mt-24">
            <h2 className="text-2xl font-semibold tracking-tight">API keys setup</h2>
            <p className="text-muted-foreground mt-2 text-sm leading-relaxed">
              Add provider keys under Account → API keys. Keys are scoped per workspace in production; this
              demo stores masked values in memory only.
            </p>
            <CodeSnippet
              title="Environment variables (CLI)"
              language="bash"
              code={`export OPENAI_API_KEY=sk-...
export ANTHROPIC_API_KEY=sk-ant-...
readme-studio generate --repo ./my-app`}
            />
          </section>

          <section id="models" className="scroll-mt-24">
            <h2 className="text-2xl font-semibold tracking-tight">Supported models</h2>
            <p className="text-muted-foreground mt-2 text-sm">
              See the <a className="text-primary underline" href="/models">models directory</a> for context
              windows, pricing, and capability tags.
            </p>
          </section>

          <section id="pricing" className="scroll-mt-24">
            <h2 className="text-2xl font-semibold tracking-tight">Pricing & plans</h2>
            <p className="text-muted-foreground mt-2 text-sm">
              Compare tiers on the <a className="text-primary underline" href="/pricing">pricing page</a>.
            </p>
          </section>

          <section id="faq" className="scroll-mt-24">
            <h2 className="text-2xl font-semibold tracking-tight">FAQ</h2>
            <Accordion multiple={false} className="mt-4 w-full max-w-2xl">
              <AccordionItem value="1">
                <AccordionTrigger>Can I use my own API keys?</AccordionTrigger>
                <AccordionContent className="text-muted-foreground text-sm">
                  Yes. Bring-your-own-key works alongside hosted inference on Pro and Enterprise.
                </AccordionContent>
              </AccordionItem>
              <AccordionItem value="2">
                <AccordionTrigger>Does the CLI match the web output?</AccordionTrigger>
                <AccordionContent className="text-muted-foreground text-sm">
                  Both use the same templates and section engine; flags map to wizard steps.
                </AccordionContent>
              </AccordionItem>
              <AccordionItem value="3">
                <AccordionTrigger>Is GitHub OAuth required?</AccordionTrigger>
                <AccordionContent className="text-muted-foreground text-sm">
                  Optional. You can paste a public repo URL or work from uploads and manual fields.
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </section>
        </div>

        <Separator className="my-16" />
        <p className="text-muted-foreground text-center text-xs">
          Tip: use the sidebar search to jump — section anchors update the URL hash.
        </p>
      </div>
    </div>
  )
}

function CliPlayground() {
  const [cmd, setCmd] = useState('readme-studio generate --repo . --model gpt-4o')
  const presets = [
    'readme-studio generate --repo . --model gpt-4o',
    'readme-studio import https://github.com/vercel/next.js --sections install,usage,api',
    'readme-studio doctor',
  ]
  return (
    <Card className="mt-4">
      <CardHeader>
        <CardTitle className="text-base">CLI command playground</CardTitle>
        <CardDescription>Click a preset or edit the command — execution is mocked.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <Input value={cmd} onChange={(e) => setCmd(e.target.value)} className="font-mono text-xs" />
        <div className="flex flex-wrap gap-2">
          {presets.map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => setCmd(p)}
              className={cn(
                'border-border bg-background hover:bg-muted rounded-md border px-2 py-1 text-left font-mono text-[11px]',
                cmd === p && 'border-primary ring-primary/30 ring-2',
              )}
            >
              {p}
            </button>
          ))}
        </div>
        <CodeSnippet title="Output (mock)" language="text" code={`$ ${cmd}\n✓ Detected Node.js · MIT license\n✓ Wrote README.md (draft)`} />
      </CardContent>
    </Card>
  )
}
