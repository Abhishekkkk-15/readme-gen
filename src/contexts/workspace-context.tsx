import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react'

import type { Workspace } from '@/types'

const WS_KEY = 'readme-studio:workspaces'
const ACTIVE_KEY = 'readme-studio:active-workspace'

const defaultWorkspace = (): Workspace => ({
  id: 'ws_default',
  name: 'Personal',
  defaultTone: 'technical',
  glossary: 'SLO\non-call\nrunbook',
  slackWebhookUrl: '',
  discordWebhookUrl: '',
})

function loadWorkspaces(): Workspace[] {
  try {
    const raw = localStorage.getItem(WS_KEY)
    if (!raw) return [defaultWorkspace()]
    const list = JSON.parse(raw) as Workspace[]
    return Array.isArray(list) && list.length ? list : [defaultWorkspace()]
  } catch {
    return [defaultWorkspace()]
  }
}

function saveWorkspaces(list: Workspace[]) {
  localStorage.setItem(WS_KEY, JSON.stringify(list))
}

function loadActiveId(fallback: string) {
  try {
    return localStorage.getItem(ACTIVE_KEY) ?? fallback
  } catch {
    return fallback
  }
}

type WorkspaceContextValue = {
  workspaces: Workspace[]
  activeWorkspace: Workspace
  setActiveWorkspaceId: (id: string) => void
  updateWorkspace: (id: string, patch: Partial<Workspace>) => void
  addWorkspace: (name: string) => void
}

const WorkspaceContext = createContext<WorkspaceContextValue | null>(null)

export function WorkspaceProvider({ children }: { children: ReactNode }) {
  const [workspaces, setWorkspaces] = useState<Workspace[]>(() => loadWorkspaces())
  const [activeId, setActiveId] = useState(() => {
    const list = loadWorkspaces()
    return loadActiveId(list[0]!.id)
  })

  const activeWorkspace = useMemo(
    () => workspaces.find((w) => w.id === activeId) ?? workspaces[0]!,
    [workspaces, activeId],
  )

  const setActiveWorkspaceId = useCallback((id: string) => {
    setActiveId(id)
    localStorage.setItem(ACTIVE_KEY, id)
  }, [])

  const updateWorkspace = useCallback((id: string, patch: Partial<Workspace>) => {
    setWorkspaces((prev) => {
      const next = prev.map((w) => (w.id === id ? { ...w, ...patch } : w))
      saveWorkspaces(next)
      return next
    })
  }, [])

  const addWorkspace = useCallback((name: string) => {
    const w: Workspace = {
      id: `ws_${Date.now()}`,
      name,
      defaultTone: 'technical',
      glossary: '',
      slackWebhookUrl: '',
      discordWebhookUrl: '',
    }
    setWorkspaces((prev) => {
      const next = [...prev, w]
      saveWorkspaces(next)
      return next
    })
    setActiveId(w.id)
    localStorage.setItem(ACTIVE_KEY, w.id)
  }, [])

  const value = useMemo<WorkspaceContextValue>(
    () => ({
      workspaces,
      activeWorkspace,
      setActiveWorkspaceId,
      updateWorkspace,
      addWorkspace,
    }),
    [workspaces, activeWorkspace, setActiveWorkspaceId, updateWorkspace, addWorkspace],
  )

  return <WorkspaceContext.Provider value={value}>{children}</WorkspaceContext.Provider>
}

export function useWorkspace() {
  const ctx = useContext(WorkspaceContext)
  if (!ctx) throw new Error('useWorkspace must be used within WorkspaceProvider')
  return ctx
}
