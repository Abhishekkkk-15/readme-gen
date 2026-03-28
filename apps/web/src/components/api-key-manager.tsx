import { KeyRound, Plus, Trash2, Zap } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import { useAuth } from '@/contexts/auth-context'
import type { User } from '@/types'

const providers = ['OpenAI', 'Anthropic', 'Google', 'Mistral', 'Custom']

type ApiKeyManagerProps = {
  triggerLabel?: string
  triggerClassName?: string
}

export function ApiKeyManager({ triggerLabel = 'Manage API keys', triggerClassName }: ApiKeyManagerProps) {
  const { user, updateUser } = useAuth()
  const [open, setOpen] = useState(false)
  const [provider, setProvider] = useState(providers[0]!)
  const [keyValue, setKeyValue] = useState('')

  if (!user) return null
  const account = user

  function addKey() {
    if (!keyValue.trim()) {
      toast.error('Enter a key to save')
      return
    }
    const masked = `${keyValue.slice(0, 6)}••••${keyValue.slice(-4)}`
    const next: User['apiKeys'] = [
      ...(account.apiKeys || []),
      { provider, key: masked, lastUsed: new Date().toISOString() },
    ]
    updateUser({ apiKeys: next })
    setKeyValue('')
    toast.success(`${provider} key saved (demo — not sent to a server)`)
  }

  function removeKey(index: number) {
    const next = (account.apiKeys || []).filter((_, i) => i !== index)
    updateUser({ apiKeys: next })
    toast.message('Key removed from this session')
  }

  function testKey(index: number) {
    const k = (account.apiKeys || [])[index]
    toast.promise(
      new Promise((resolve) => setTimeout(resolve, 900)),
      {
        loading: `Testing ${k?.provider}…`,
        success: 'Key responds OK (mock)',
        error: 'Could not verify',
      },
    )
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button variant="outline" size="sm" className={triggerClassName}>
            <KeyRound className="size-4" />
            {triggerLabel}
          </Button>
        }
      />
      <DialogContent className="max-h-[90vh] max-w-md overflow-hidden sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>API keys</DialogTitle>
          <DialogDescription>
            Keys stay in your browser for this demo. In production they would be encrypted at rest.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-2">
          <div className="grid gap-2">
            <Label htmlFor="key-provider">Provider</Label>
            <Select value={provider} onValueChange={(v) => v && setProvider(v)}>
              <SelectTrigger id="key-provider">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {providers.map((p) => (
                  <SelectItem key={p} value={p}>
                    {p}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="key-secret">Secret</Label>
            <Input
              id="key-secret"
              type="password"
              placeholder="sk-…"
              value={keyValue}
              onChange={(e) => setKeyValue(e.target.value)}
              autoComplete="off"
            />
          </div>
          <Button type="button" onClick={addKey} className="gap-2">
            <Plus className="size-4" />
            Add key
          </Button>
        </div>

        <Separator />

        <div>
          <p className="text-muted-foreground mb-2 text-xs font-medium tracking-wide uppercase">
            Stored keys
          </p>
          <ScrollArea className="h-48 rounded-lg border">
            <ul className="divide-border divide-y p-2">
              {(account.apiKeys || []).length === 0 ? (
                <li className="text-muted-foreground p-4 text-center text-sm">No keys yet</li>
              ) : (
                (account.apiKeys || []).map((k, i) => (
                  <li key={`${k.provider}-${i}`} className="flex flex-wrap items-center gap-2 py-3">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium">{k.provider}</p>
                      <p className="text-muted-foreground font-mono text-xs">{k.key}</p>
                      <p className="text-muted-foreground text-[11px]">
                        Last used {new Date(k.lastUsed).toLocaleString()}
                      </p>
                    </div>
                    <div className="flex gap-1">
                      <Button type="button" variant="ghost" size="icon-sm" onClick={() => testKey(i)}>
                        <Zap className="size-4" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => removeKey(i)}
                        aria-label="Remove key"
                      >
                        <Trash2 className="text-destructive size-4" />
                      </Button>
                    </div>
                  </li>
                ))
              )}
            </ul>
          </ScrollArea>
        </div>

        <DialogFooter>
          <p className="text-muted-foreground text-xs">
            Usage this month: {account.usage.generationsUsed} generations
            {account.usage.generationsLimit > 0 ? ` / ${account.usage.generationsLimit}` : ' (unlimited)'}
          </p>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
