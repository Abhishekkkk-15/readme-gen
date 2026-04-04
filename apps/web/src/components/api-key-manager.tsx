import { KeyRound, Plus, Trash2, Zap } from 'lucide-react'
import { useEffect, useState } from 'react'
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

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'
const providers = ['OpenAI', 'Gemini', 'Groq'] as const

type ApiKeyProvider = (typeof providers)[number]

type ApiKeyManagerProps = {
  triggerLabel?: string
  triggerClassName?: string
  initialProvider?: ApiKeyProvider
  open?: boolean
  onOpenChange?: (open: boolean) => void
  hideTrigger?: boolean
}

export function ApiKeyManager({
  triggerLabel = 'Manage API keys',
  triggerClassName,
  initialProvider,
  open: controlledOpen,
  onOpenChange,
  hideTrigger = false,
}: ApiKeyManagerProps) {
  const { user, updateUser, token } = useAuth()
  const [uncontrolledOpen, setUncontrolledOpen] = useState(false)
  const [provider, setProvider] = useState<ApiKeyProvider>(initialProvider || providers[0])
  const [keyValue, setKeyValue] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const open = controlledOpen ?? uncontrolledOpen

  useEffect(() => {
    if (initialProvider) {
      setProvider(initialProvider)
    }
  }, [initialProvider])

  function handleOpenChange(nextOpen: boolean) {
    onOpenChange?.(nextOpen)
    if (controlledOpen == null) {
      setUncontrolledOpen(nextOpen)
    }
  }

  function handleProviderChange(nextProvider: string | null) {
    if (nextProvider && providers.includes(nextProvider as ApiKeyProvider)) {
      setProvider(nextProvider as ApiKeyProvider)
    }
  }

  async function addKey() {
    if (!keyValue.trim()) {
      toast.error('Enter a key to save')
      return
    }

    if (!token) {
      toast.error('Sign in to save API keys')
      return
    }

    setIsSaving(true)
    toast.promise(
      fetch(`${API_URL}/auth/keys`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ provider, key: keyValue.trim() }),
      })
        .then(async (res) => {
          const data = await res.json()
          if (!res.ok) {
            throw new Error(data.error || 'Failed to save API key')
          }
          updateUser(data.user as Partial<User>)
          setKeyValue('')
          return `${provider} key saved`
        })
        .finally(() => setIsSaving(false)),
      {
        loading: `Saving ${provider} key...`,
        success: (message) => message,
        error: (err) => err.message || 'Failed to save API key',
      },
    )
  }

  function removeKey(index: number) {
    if (!token) {
      toast.error('Sign in to manage API keys')
      return
    }

    const key = (user?.apiKeys || [])[index]
    if (!key?.provider) return

    toast.promise(
      fetch(`${API_URL}/auth/keys/${encodeURIComponent(key.provider)}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }).then(async (res) => {
        const data = await res.json()
        if (!res.ok) {
          throw new Error(data.error || 'Failed to remove API key')
        }
        updateUser(data.user as Partial<User>)
        return `${key.provider} key removed`
      }),
      {
        loading: `Removing ${key.provider} key...`,
        success: (message) => message,
        error: (err) => err.message || 'Failed to remove API key',
      },
    )
  }

  function testKey(index: number) {
    const k = (user?.apiKeys || [])[index]
    toast.promise(new Promise((resolve) => setTimeout(resolve, 900)), {
      loading: `Testing ${k?.provider}...`,
      success: 'Stored key metadata looks good (mock)',
      error: 'Could not verify',
    })
  }

  if (!user) return null

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      {hideTrigger ? null : (
        <DialogTrigger
          render={
            <Button variant="outline" size="sm" className={triggerClassName}>
              <KeyRound className="size-4" />
              {triggerLabel}
            </Button>
          }
        />
      )}
      <DialogContent className="max-h-[90vh] max-w-md overflow-hidden sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>API keys</DialogTitle>
          <DialogDescription>
            Keys are encrypted on the server and only masked previews are shown after save.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-2">
          <div className="grid gap-2">
            <Label htmlFor="key-provider">Provider</Label>
            <Select value={provider} onValueChange={handleProviderChange}>
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
              placeholder="Paste provider key"
              value={keyValue}
              onChange={(e) => setKeyValue(e.target.value)}
              autoComplete="off"
            />
          </div>
          <Button type="button" onClick={addKey} className="gap-2" disabled={isSaving}>
            <Plus className="size-4" />
            {isSaving ? 'Saving...' : 'Add key'}
          </Button>
        </div>

        <Separator />

        <div>
          <p className="text-muted-foreground mb-2 text-xs font-medium tracking-wide uppercase">
            Stored keys
          </p>
          <ScrollArea className="h-48 rounded-lg border">
            <ul className="divide-border divide-y p-2">
              {(user.apiKeys || []).length === 0 ? (
                <li className="text-muted-foreground p-4 text-center text-sm">No keys yet</li>
              ) : (
                (user.apiKeys || []).map((k, i) => (
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
            Usage this month: {user.usage.generationsUsed} generations
            {user.usage.generationsLimit > 0 ? ` / ${user.usage.generationsLimit}` : ' (unlimited)'}
          </p>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
