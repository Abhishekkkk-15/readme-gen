import { motion } from 'framer-motion'
import { useEffect, useState } from 'react'
import {
  ArrowRight,
  BookOpen,
  Boxes,
  Command,
  Download,
  FileJson,
  FolderGit,
  Layers,
  Sparkles,
  Terminal,
  Wand2,
} from 'lucide-react'
import { Link } from 'react-router-dom'

import { buttonVariants } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { stats } from '@/data/mock'
import { useTypingEffect } from '@/hooks/use-typing-effect'
import { cn } from '@/lib/utils'

const features = [
  {
    title: 'Multi-model support',
    desc: 'OpenAI, Gemini, and Groq with the same README workflow across web and CLI.',
    icon: Layers,
  },
  {
    title: 'GitHub integration',
    desc: 'Import repos, detect stack, sync READMEs with OAuth-ready flows.',
    icon: FolderGit,
  },
  {
    title: 'Interactive editor',
    desc: 'Split markdown editor with live preview and section-aware layout.',
    icon: BookOpen,
  },
  {
    title: 'CLI tool',
    desc: 'Generate from CI or your terminal with the same engine as the web app.',
    icon: Terminal,
  },
  {
    title: 'Multiple exports',
    desc: 'Markdown, HTML, PDF, gist, or push directly to your default branch.',
    icon: FileJson,
  },
  {
    title: 'Version-control friendly',
    desc: 'Deterministic sections and diffs that play nicely with PR reviews.',
    icon: Boxes,
  },
]

const TYPING_PHRASES = [
  'repo-aware READMEs in one click',
  'tone-matched docs your team will actually read',
  'CLI + web, same generation pipeline',
  'badges, install steps, and API tables — auto-structured',
] as const

const tiers = [
  {
    name: 'Free',
    price: '$0',
    blurb: 'Try the full workflow on us.',
    items: ['5 READMEs / month', 'Basic models', 'Community support'],
    href: '/pricing',
  },
  {
    name: 'Pro',
    price: '$9.99',
    period: '/mo',
    blurb: 'For builders and product teams.',
    items: ['Unlimited READMEs', 'OpenAI, Gemini, Groq', 'Priority support', 'API access'],
    href: '/pricing',
    highlight: true,
  },
  {
    name: 'Enterprise',
    price: 'Custom',
    blurb: 'Compliance, VPC, and custom models.',
    items: ['Dedicated support', 'Custom limits', 'Fine-tuning & SLAs'],
    href: '/pricing',
  },
]

export function LandingPage() {
  const typed = useTypingEffect(TYPING_PHRASES)

  return (
    <div className="relative overflow-hidden">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 opacity-90 dark:opacity-60"
        style={{
          background:
            'radial-gradient(ellipse 80% 50% at 50% -20%, oklch(0.72 0.2 285 / 0.35), transparent), radial-gradient(ellipse 60% 40% at 100% 0%, oklch(0.65 0.18 240 / 0.2), transparent), radial-gradient(ellipse 50% 30% at 0% 20%, oklch(0.7 0.15 320 / 0.18), transparent)',
        }}
      />
      <motion.div
        aria-hidden
        className="bg-primary/20 absolute -top-32 left-1/2 size-[520px] -translate-x-1/2 rounded-full blur-3xl"
        animate={{ scale: [1, 1.08, 1], opacity: [0.35, 0.5, 0.35] }}
        transition={{ duration: 10, repeat: Infinity, ease: 'easeInOut' }}
      />

      <section className="mx-auto max-w-6xl px-4 pt-16 pb-20 sm:px-6 sm:pt-24 sm:pb-28">
        <div className="mx-auto max-w-3xl text-center">
          <Badge variant="secondary" className="mb-4 gap-1.5 px-3 py-1">
            <Sparkles className="size-3.5" />
            AI README platform
          </Badge>
          <h1 className="text-foreground text-4xl font-semibold tracking-tight sm:text-5xl md:text-6xl">
            Ship documentation that matches your code.
          </h1>
          <p className="text-muted-foreground mx-auto mt-5 max-w-xl text-lg sm:text-xl">
            <span className="text-foreground font-medium">{typed}</span>
            <span className="text-primary animate-pulse">|</span>
          </p>
          <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row sm:gap-4">
            <Link to="/generate" className={cn(buttonVariants({ size: 'lg' }), 'gap-2 px-6')}>
              <Wand2 className="size-4" />
              Try for free
            </Link>
            <Link
              to="/docs"
              className={cn(buttonVariants({ variant: 'outline', size: 'lg' }), 'gap-2 px-6')}
            >
              <BookOpen className="size-4" />
              View docs
            </Link>
            <Link
              to="/docs#cli-installation"
              className={cn(buttonVariants({ variant: 'secondary', size: 'lg' }), 'gap-2 px-6')}
            >
              <Download className="size-4" />
              CLI install
            </Link>
          </div>
          <div className="text-muted-foreground mt-10 flex flex-wrap items-center justify-center gap-x-8 gap-y-3 text-sm">
            <span className="inline-flex items-center gap-2">
              <FolderGit className="size-4" />
              <strong className="text-foreground font-semibold">
                {stats.githubStars.toLocaleString()}
              </strong>
              GitHub stars
            </span>
            <span className="inline-flex items-center gap-2">
              <Command className="size-4" />
              <strong className="text-foreground font-semibold">
                {stats.cliDownloads.toLocaleString()}
              </strong>
              CLI downloads
            </span>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
        <h2 className="text-center text-2xl font-semibold tracking-tight sm:text-3xl">
          Everything you need to document faster
        </h2>
        <p className="text-muted-foreground mx-auto mt-3 max-w-2xl text-center text-sm sm:text-base">
          From first commit to enterprise compliance — one stack for README generation.
        </p>
        <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((f, i) => (
            <motion.div
              key={f.title}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-40px' }}
              transition={{ delay: i * 0.05, duration: 0.4 }}
            >
              <Card className="h-full border-border/80 bg-card/60 backdrop-blur-sm transition-shadow hover:shadow-md">
                <CardHeader className="pb-2">
                  <div className="bg-primary/10 text-primary mb-2 inline-flex size-10 items-center justify-center rounded-lg">
                    <f.icon className="size-5" />
                  </div>
                  <CardTitle className="text-base">{f.title}</CardTitle>
                  <CardDescription className="text-sm leading-relaxed">{f.desc}</CardDescription>
                </CardHeader>
              </Card>
            </motion.div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
        <div className="mb-10 flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">Pricing preview</h2>
            <p className="text-muted-foreground mt-2 max-w-xl text-sm sm:text-base">
              Start free, scale when READMEs become part of your release train.
            </p>
          </div>
          <Link
            to="/pricing"
            className={cn(buttonVariants({ variant: 'ghost' }), 'gap-1 text-primary')}
          >
            Compare plans
            <ArrowRight className="size-4" />
          </Link>
        </div>
        <div className="grid gap-6 lg:grid-cols-3">
          {tiers.map((t) => (
            <Card
              key={t.name}
              className={cn(
                'relative overflow-hidden border-border/80',
                t.highlight && 'border-primary ring-primary/20 shadow-lg ring-2',
              )}
            >
              {t.highlight ? (
                <div className="bg-primary text-primary-foreground absolute end-4 top-4 rounded-full px-2 py-0.5 text-[10px] font-medium">
                  Popular
                </div>
              ) : null}
              <CardHeader>
                <CardTitle className="text-lg">{t.name}</CardTitle>
                <CardDescription>{t.blurb}</CardDescription>
                <p className="pt-2 text-3xl font-semibold tracking-tight">
                  {t.price}
                  {t.period ? (
                    <span className="text-muted-foreground text-base font-normal">{t.period}</span>
                  ) : null}
                </p>
              </CardHeader>
              <CardContent className="space-y-3">
                <ul className="text-muted-foreground space-y-2 text-sm">
                  {t.items.map((item) => (
                    <li key={item} className="flex gap-2">
                      <span className="text-primary">✓</span>
                      {item}
                    </li>
                  ))}
                </ul>
                <Link to={t.href} className={cn(buttonVariants({ variant: t.highlight ? 'default' : 'outline' }), 'mt-4 w-full')}>
                  Get started
                </Link>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
        <h2 className="text-center text-2xl font-semibold tracking-tight sm:text-3xl">
          Loved by platform teams
        </h2>
        <TestimonialCarousel />
      </section>
    </div>
  )
}

function TestimonialCarousel() {
  const [i, setI] = useState(0)
  const list = stats.testimonials

  useEffect(() => {
    const t = setInterval(() => setI((n) => (n + 1) % list.length), 6000)
    return () => clearInterval(t)
  }, [list.length])

  const item = list[i]!

  return (
    <div className="mx-auto mt-10 max-w-2xl">
      <motion.div
        key={item.quote}
        initial={{ opacity: 0, x: 24 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: -24 }}
        transition={{ duration: 0.35 }}
        className="border-border bg-card/70 rounded-2xl border p-8 shadow-sm backdrop-blur-sm"
      >
        <p className="text-foreground text-lg leading-relaxed font-medium">&ldquo;{item.quote}&rdquo;</p>
        <p className="text-muted-foreground mt-4 text-sm">
          <span className="text-foreground font-medium">{item.author}</span> — {item.role}
        </p>
      </motion.div>
      <div className="mt-4 flex justify-center gap-1.5">
        {list.map((_, idx) => (
          <button
            key={idx}
            type="button"
            aria-label={`Show testimonial ${idx + 1}`}
            className={cn(
              'size-2 rounded-full transition-colors',
              idx === i ? 'bg-primary' : 'bg-muted-foreground/30 hover:bg-muted-foreground/50',
            )}
            onClick={() => setI(idx)}
          />
        ))}
      </div>
    </div>
  )
}
