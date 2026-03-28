import { Bell, Building2, Plus } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useWorkspace } from '@/contexts/workspace-context'

export function SettingsPage() {
  const { workspaces, activeWorkspace, setActiveWorkspaceId, updateWorkspace, addWorkspace } = useWorkspace()
  const [newWs, setNewWs] = useState('')

  async function pingWebhook(url: string, label: string) {
    if (!url.trim()) {
      toast.error('Enter a webhook URL first')
      return
    }
    toast.promise(
      fetch(url, { method: 'POST', mode: 'no-cors', body: JSON.stringify({ text: `ReadMe Studio test (${label})` }) }),
      {
        loading: 'Sending test payload…',
        success: 'Request dispatched (browser cannot read no-cors response)',
        error: 'Failed to reach webhook',
      },
    )
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
      <h1 className="text-3xl font-semibold tracking-tight">Workspace settings</h1>
      <p className="text-muted-foreground mt-2 text-sm">
        Shared tone, glossary, and notification hooks — stored locally for this demo.
      </p>

      <Card className="mt-8">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Building2 className="size-4" />
            Active workspace
          </CardTitle>
          <CardDescription>Switch context for snapshots, usage labels, and webhooks.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-2">
            <Label>Workspace</Label>
            <Select value={activeWorkspace.id} onValueChange={(v) => v && setActiveWorkspaceId(v)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {workspaces.map((w) => (
                  <SelectItem key={w.id} value={w.id}>
                    {w.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex gap-2">
            <Input placeholder="New workspace name" value={newWs} onChange={(e) => setNewWs(e.target.value)} />
            <Button
              type="button"
              variant="secondary"
              className="gap-1 shrink-0"
              onClick={() => {
                if (!newWs.trim()) return
                addWorkspace(newWs.trim())
                setNewWs('')
                toast.success('Workspace created')
              }}
            >
              <Plus className="size-4" />
              Add
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="text-base">Brand voice</CardTitle>
          <CardDescription>Default tone for new README drafts and glossary terms to bias the model.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-2">
            <Label htmlFor="tone">Default tone</Label>
            <Select
              value={activeWorkspace.defaultTone}
              onValueChange={(v) => v && updateWorkspace(activeWorkspace.id, { defaultTone: v })}
            >
              <SelectTrigger id="tone">
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
          <div className="grid gap-2">
            <Label htmlFor="gloss">Glossary (one term per line)</Label>
            <Textarea
              id="gloss"
              rows={5}
              value={activeWorkspace.glossary}
              onChange={(e) => updateWorkspace(activeWorkspace.id, { glossary: e.target.value })}
              placeholder="SLO&#10;on-call&#10;data residency"
            />
          </div>
        </CardContent>
      </Card>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Bell className="size-4" />
            Webhooks
          </CardTitle>
          <CardDescription>Notify Slack or Discord when a README is ready for review.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-2">
            <Label htmlFor="slack">Slack incoming webhook</Label>
            <Input
              id="slack"
              placeholder="https://hooks.slack.com/services/…"
              value={activeWorkspace.slackWebhookUrl}
              onChange={(e) => updateWorkspace(activeWorkspace.id, { slackWebhookUrl: e.target.value })}
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="w-fit"
              onClick={() => pingWebhook(activeWorkspace.slackWebhookUrl, 'Slack')}
            >
              Test Slack
            </Button>
          </div>
          <Separator />
          <div className="grid gap-2">
            <Label htmlFor="discord">Discord webhook</Label>
            <Input
              id="discord"
              placeholder="https://discord.com/api/webhooks/…"
              value={activeWorkspace.discordWebhookUrl}
              onChange={(e) => updateWorkspace(activeWorkspace.id, { discordWebhookUrl: e.target.value })}
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="w-fit"
              onClick={() => pingWebhook(activeWorkspace.discordWebhookUrl, 'Discord')}
            >
              Test Discord
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
