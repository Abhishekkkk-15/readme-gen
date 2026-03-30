import { useQuery } from '@tanstack/react-query'
import { ArrowRight, FilePlus, FolderGit, History, KeyRound } from 'lucide-react'
import { useState } from 'react'
import { Link, Navigate } from 'react-router-dom'

import { ApiKeyManager } from '@/components/api-key-manager'
import { ModelSelector } from '@/components/model-selector'
import { buttonVariants } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Separator } from '@/components/ui/separator'
import { useAuth } from '@/contexts/auth-context'
import { mockModels, mockUser } from '@/data/mock'
import type { Generation } from '@/types'
import { cn } from '@/lib/utils'

async function fetchHistory(token: string | null): Promise<Generation[]> {
  if (!token) return []
  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'
  const res = await fetch(`${API_URL}/generate/projects`, {
    headers: { Authorization: `Bearer ${token}` }
  })
  if (!res.ok) return []
  const data = await res.json()
  return data.map((d: any) => ({
    id: d._id,
    title: d.title,
    content: d.readmeContent,
    createdAt: d.createdAt,
    repoUrl: d.repoUrl
  }))
}

export function DashboardPage() {
  const { token, isAuthenticated, user, isGuest } = useAuth()
  const [prefModel, setPrefModel] = useState(mockModels[0]!.id)

  const { data: history = [], isLoading } = useQuery({
    queryKey: ['generations', token],
    queryFn: () => fetchHistory(token),
    enabled: !!token,
  })

  if (!isAuthenticated) {
    return <Navigate to="/auth" replace />
  }

  const usageUser = user || mockUser
  const limit = usageUser.usage.generationsLimit
  const used = usageUser.usage.generationsUsed
  const pct = limit > 0 ? Math.min(100, (used / limit) * 100) : 0

  const tokensUsed = usageUser.usage.tokensUsed || 0
  const tokensLimit = usageUser.usage.tokensLimit || 5000
  const tokensPct = tokensLimit > 0 ? Math.min(100, (tokensUsed / tokensLimit) * 100) : 0

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            {user ? user.email : 'Guest'} · {isGuest ? 'Preview session' : `${usageUser.plan} plan`}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link to="/generate" className={cn(buttonVariants(), 'gap-2')}>
            <FilePlus className="size-4" />
            New README
          </Link>
          <Link to="/generate?step=import" className={cn(buttonVariants({ variant: 'secondary' }), 'gap-2')}>
            <FolderGit className="size-4" />
            Import GitHub
          </Link>
        </div>
      </div>

      <div className="mt-10 grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Usage & Quotas</CardTitle>
            <CardDescription>
              Your monthly usage limits for generated READMEs and LLM tokens.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <div className="flex justify-between text-xs">
                <span className="font-medium text-muted-foreground">Generations</span>
                <span className="font-bold">{used} / {limit}</span>
              </div>
              <Progress value={pct} className="h-1.5" />
            </div>

            <div className="space-y-2">
              <div className="flex justify-between text-xs">
                <span className="font-medium text-muted-foreground">Token Usage</span>
                <span className="font-bold">{tokensUsed.toLocaleString()} / {tokensLimit.toLocaleString()}</span>
              </div>
              <Progress value={tokensPct} className="h-1.5" />
            </div>

            <p className="text-muted-foreground text-[10px] uppercase tracking-wider font-semibold">
              Resets on the 1st of each month.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <KeyRound className="size-4" />
              API keys
            </CardTitle>
            <CardDescription>Quick add or rotate provider keys.</CardDescription>
          </CardHeader>
          <CardContent>
            {user ? (
              <ApiKeyManager triggerLabel="Manage keys" />
            ) : (
              <p className="text-muted-foreground text-sm">Sign in to store encrypted keys.</p>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="mt-10 grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Default model</CardTitle>
            <CardDescription>Used as the preset when you start a new README.</CardDescription>
          </CardHeader>
          <CardContent>
            <ModelSelector value={prefModel} onChange={setPrefModel} label="Preferred model" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <History className="size-4" />
              Recent activity
            </CardTitle>
            <CardDescription>Last few generations in this workspace.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {isLoading ? (
               <p className="text-sm text-muted-foreground">Loading activity...</p>
            ) : history.length > 0 ? (
              history.slice(0, 4).map((g) => (
                <div key={g.id} className="flex items-start justify-between gap-2 border-b pb-3 last:border-0">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{g.title}</p>
                    <p className="text-muted-foreground text-xs">
                      {new Date(g.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  <Link
                    to="/generate"
                    className={cn(buttonVariants({ variant: 'ghost', size: 'sm' }), 'shrink-0 gap-1')}
                  >
                    Open
                    <ArrowRight className="size-3" />
                  </Link>
                </div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground italic">No recent activity found.</p>
            )}
          </CardContent>
        </Card>
      </div>

      <Separator className="my-12" />

      <div>
        <h2 className="text-lg font-semibold">Recent READMEs</h2>
        <ul className="mt-4 space-y-3">
          {isLoading ? (
            <p className="text-sm text-muted-foreground">Loading...</p>
          ) : history.length > 0 ? (
            history.map((g) => (
              <li key={g.id}>
                <Card className="border-border/80 transition-colors hover:bg-muted/30">
                  <CardContent className="flex flex-col gap-2 p-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="font-medium">{g.title}</p>
                      <p className="text-muted-foreground text-xs">
                        {g.repoUrl ? (
                          <a href={g.repoUrl} className="text-primary hover:underline" target="_blank" rel="noreferrer">
                            {g.repoUrl}
                          </a>
                        ) : (
                          'No repo linked'
                        )}
                      </p>
                    </div>
                    <Link to="/generate" className={buttonVariants({ variant: 'outline', size: 'sm' })}>
                      Continue editing
                    </Link>
                  </CardContent>
                </Card>
              </li>
            ))
          ) : (
            <div className="flex flex-col items-center justify-center p-12 border-2 border-dashed rounded-xl border-border">
               <History className="size-8 text-muted-foreground/50 mb-3" />
               <p className="text-muted-foreground text-sm">You haven't generated any READMEs yet.</p>
               <Link to="/generate" className="mt-4 text-xs font-semibold text-primary hover:underline">Start your first project →</Link>
            </div>
          )}
        </ul>
      </div>
    </div>
  )
}
