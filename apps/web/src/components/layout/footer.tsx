import { Briefcase, FolderGit, MessageCircle } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { toast } from 'sonner'

import { Button, buttonVariants } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Separator } from '@/components/ui/separator'
import { cn } from '@/lib/utils'

const product = [
  { to: '/docs', label: 'Documentation' },
  { to: '/pricing', label: 'Pricing' },
  { to: '/models', label: 'AI models' },
  { to: '/generate', label: 'Generator' },
]

const legal = [
  { to: '#', label: 'Privacy' },
  { to: '#', label: 'Terms' },
  { to: '#', label: 'Security' },
]

export function Footer() {
  const [email, setEmail] = useState('')

  function subscribe(e: React.FormEvent) {
    e.preventDefault()
    if (!email.trim()) return
    toast.success('Thanks — we will send updates to your inbox.')
    setEmail('')
  }

  return (
    <footer className="border-t bg-muted/30">
      <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
        <div className="grid gap-10 md:grid-cols-2 lg:grid-cols-4">
          <div className="space-y-4">
            <p className="text-foreground font-semibold">ReadMe Studio</p>
            <p className="text-muted-foreground text-sm leading-relaxed">
              AI-powered README generation for teams that ship fast. Web, CLI, and GitHub — one
              workflow.
            </p>
            <div className="flex gap-2">
              <a
                href="https://github.com"
                target="_blank"
                rel="noreferrer"
                aria-label="GitHub"
                className={cn(buttonVariants({ variant: 'outline', size: 'icon-sm' }))}
              >
                <FolderGit className="size-4" />
              </a>
              <a
                href="https://twitter.com"
                target="_blank"
                rel="noreferrer"
                aria-label="Twitter"
                className={cn(buttonVariants({ variant: 'outline', size: 'icon-sm' }))}
              >
                <MessageCircle className="size-4" />
              </a>
              <a
                href="https://linkedin.com"
                target="_blank"
                rel="noreferrer"
                aria-label="LinkedIn"
                className={cn(buttonVariants({ variant: 'outline', size: 'icon-sm' }))}
              >
                <Briefcase className="size-4" />
              </a>
            </div>
          </div>

          <div>
            <p className="text-foreground mb-3 text-sm font-semibold">Product</p>
            <ul className="space-y-2">
              {product.map(({ to, label }) => (
                <li key={to}>
                  <Link
                    to={to}
                    className="text-muted-foreground hover:text-foreground text-sm transition-colors"
                  >
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <p className="text-foreground mb-3 text-sm font-semibold">Legal</p>
            <ul className="space-y-2">
              {legal.map(({ to, label }) => (
                <li key={label}>
                  <a
                    href={to}
                    className="text-muted-foreground hover:text-foreground text-sm transition-colors"
                  >
                    {label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <p className="text-foreground mb-3 text-sm font-semibold">Newsletter</p>
            <p className="text-muted-foreground mb-3 text-sm">
              Release notes, model updates, and CLI tips — monthly at most.
            </p>
            <form onSubmit={subscribe} className="flex flex-col gap-2 sm:flex-row">
              <Input
                type="email"
                placeholder="you@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="flex-1"
              />
              <Button type="submit">Subscribe</Button>
            </form>
          </div>
        </div>

        <Separator className="my-8" />
        <p className="text-muted-foreground text-center text-xs">
          © {new Date().getFullYear()} ReadMe Studio. Demo UI — no backend attached.
        </p>
      </div>
    </footer>
  )
}
