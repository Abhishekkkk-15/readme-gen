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
  { id: 'cli-reference', title: 'CLI reference' },
  { id: 'api-keys', title: 'API keys setup' },
  { id: 'models', title: 'Supported models' },
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
              Readme gen generates structured README.md files from your repository metadata, optional
              uploads, and AI models you choose — using your own API keys for full control.
            </p>
            <div className="mt-8 grid gap-8 md:grid-cols-2">
              <div className="space-y-4">
                <h3 className="text-lg font-medium">1. Install the CLI</h3>
                <p className="text-muted-foreground text-sm">
                  Get the latest version of the CLI tool globally.
                </p>
                <CodeSnippet language="bash" code="npm install -g @abhishekkkk15/readmegen-cli" />
              </div>
              <div className="space-y-4">
                <h3 className="text-lg font-medium">2. Configure Keys</h3>
                <p className="text-muted-foreground text-sm">
                  Initialize your preferred AI provider (Groq, Gemini, or OpenAI).
                </p>
                <CodeSnippet language="bash" code="readmegen init" />
              </div>
              <div className="space-y-4">
                <h3 className="text-lg font-medium">3. Generate README</h3>
                <p className="text-muted-foreground text-sm">
                  Run the generator in your project root. It will analyze your code automatically.
                </p>
                <CodeSnippet language="bash" code="readmegen generate" />
              </div>
              <div className="space-y-4">
                <h3 className="text-lg font-medium">4. Preview & Refine</h3>
                <p className="text-muted-foreground text-sm">
                  Preview the result in your terminal or open the generated file.
                </p>
                <CodeSnippet language="bash" code="readmegen preview" />
              </div>
            </div>
          </section>

          <section id="cli-installation" className="scroll-mt-24">
            <h2 className="text-2xl font-semibold tracking-tight">CLI installation</h2>
            <p className="text-muted-foreground mt-2 text-sm">
              Install the CLI globally with your preferred package manager to use it in any project.
            </p>
            <div className="mt-6 space-y-4">
              <CodeSnippet title="npm" language="bash" code="npm install -g @abhishekkkk15/readmegen-cli" />
              <CodeSnippet title="yarn" language="bash" code="yarn global add @abhishekkkk15/readmegen-cli" />
              <CodeSnippet title="pnpm" language="bash" code="pnpm add -g @abhishekkkk15/readmegen-cli" />
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
              Readme gen uses environment variables or a local config file to store your API keys. 
              Running <code className="bg-muted rounded px-1">readmegen init</code> is the easiest way to set them up.
            </p>
            <div className="mt-6 space-y-6">
              <div className="space-y-2">
                <p className="text-sm font-medium">Using Environment Variables</p>
                <CodeSnippet
                  title="bash / zsh"
                  language="bash"
                  code={`export GROQ_API_KEY=gsk_...
export GOOGLE_GENERATIVE_AI_API_KEY=AIza...
readmegen generate`}
                />
              </div>
              <div className="space-y-2">
                <p className="text-sm font-medium">Using CLI Config</p>
                <CodeSnippet
                  title="Interactive Setup"
                  language="bash"
                  code="readmegen init"
                />
              </div>
            </div>
          </section>

          <section id="models" className="scroll-mt-24">
            <h2 className="text-2xl font-semibold tracking-tight">Supported models</h2>
            <p className="text-muted-foreground mt-2 text-sm">
              See the <a className="text-primary underline" href="/models">models directory</a> for context
              windows, pricing, and capability tags.
            </p>
          </section>

          <section id="cli-reference" className="scroll-mt-24">
            <h2 className="text-2xl font-semibold tracking-tight">CLI commands reference</h2>
            <p className="text-muted-foreground mt-2 text-sm">
              Detailed list of all available commands and flags for the <code className="bg-muted rounded px-1">readmegen</code> CLI.
            </p>
            
            <div className="mt-8 space-y-10">
              {/* Init Command */}
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <h3 className="text-lg font-semibold font-mono text-primary">readmegen init</h3>
                </div>
                <p className="text-muted-foreground text-sm leading-relaxed">
                  The primary configuration command. It guides you through selecting an AI provider, setting up your API keys, and picking a default model. 
                  All settings are stored in a local config file (usually in your user profile).
                </p>
              </div>

              {/* Generate Command */}
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <h3 className="text-lg font-semibold font-mono text-primary">readmegen generate</h3>
                </div>
                <p className="text-muted-foreground text-sm leading-relaxed">
                  Analyzes your codebase and generates a <code className="bg-muted rounded px-1">README.md</code>. 
                  It extracts project structure, entry points, dependencies, and business logic to provide context to the AI.
                </p>
                
                <div className="rounded-lg border border-border overflow-hidden">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-muted/50 border-b border-border">
                      <tr>
                        <th className="px-4 py-2 font-medium">Flag</th>
                        <th className="px-4 py-2 font-medium">Description</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {[
                        { f: '--tone <tone>', d: 'professional, friendly, minimal, enterprise, humorous, concise, etc.' },
                        { f: '--persona <id>', d: 'Senior Developer | Startup Founder | Educational/Beginner | Open Source Contributor' },
                        { f: '--provider <id>', d: 'Override default provider: groq, gemini, or openai' },
                        { f: '--model <id>', d: 'Specific model ID (e.g. gemini-2.0-flash, llama-3.1-70b-versatile)' },
                        { f: '--mode <mode>', d: 'overwrite (default), rewrite (merges with existing), or append' },
                        { f: '--output, -o <file>', d: 'Custom filename (default: README.md)' },
                        { f: '--files <paths...>', d: 'Manually specify important files for deeper AST analysis' },
                        { f: '--sections <list...>', d: 'Include specific sections: Installation, Usage, API Reference, etc.' },
                        { f: '--yes, -y', d: 'Skip all interactive prompts (use defaults/flags)' },
                        { f: '--nested, -n', d: 'Analyze and generate READMEs for sub-directories (Monorepos)' },
                        { f: '--context <text>', d: 'Provide extra business context or "why" for the generator' },
                      ].map((flag) => (
                        <tr key={flag.f}>
                          <td className="px-4 py-3 font-mono text-xs whitespace-nowrap text-primary">{flag.f}</td>
                          <td className="px-4 py-3 text-muted-foreground leading-relaxed">{flag.d}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Preview Command */}
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <h3 className="text-lg font-semibold font-mono text-primary">readmegen preview</h3>
                </div>
                <p className="text-muted-foreground text-sm leading-relaxed">
                  Renders the generated markdown directly in your terminal using a rich text renderer. 
                  Useful for quick verification before committing.
                </p>
              </div>

              {/* Config Command */}
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <h3 className="text-lg font-semibold font-mono text-primary">readmegen config</h3>
                </div>
                <p className="text-muted-foreground text-sm">Manage CLI settings manually without running full initialization.</p>
                <div className="grid gap-3 sm:grid-cols-2">
                  {[
                    { c: 'view', d: 'Show current configuration' },
                    { c: 'set-key <key>', d: 'Update API key (use -p for provider)' },
                    { c: 'set-model <id>', d: 'Change the default default AI model' },
                    { c: 'reset', d: 'Clear all saved configuration' },
                  ].map((sub) => (
                    <div key={sub.c} className="bg-muted/40 rounded-md p-3 border border-border">
                      <p className="font-mono text-xs font-semibold">readmegen config {sub.c}</p>
                      <p className="text-xs text-muted-foreground mt-1">{sub.d}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
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
  const [cmd, setCmd] = useState('readmegen generate --tone professional --persona "Senior Developer"')
  const presets = [
    'readmegen init',
    'readmegen generate --yes',
    'readmegen preview',
    'readmegen config view',
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
        <CodeSnippet title="Output (mock)" language="text" code={`$ ${cmd}\n✓ Analyzing local codebase...\n✓ Build README (gemini · gemini-2.0-flash)\n✓ Written: ./README.md\n\nQuality score: 92/100`} />
      </CardContent>
    </Card>
  )
}
