import type { ReadmeSnapshot } from '@/types'

const KEY = 'readme-studio:snapshots'

function readAll(): ReadmeSnapshot[] {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as ReadmeSnapshot[]
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function writeAll(list: ReadmeSnapshot[]) {
  localStorage.setItem(KEY, JSON.stringify(list))
}

export function loadSnapshots(): ReadmeSnapshot[] {
  return readAll().sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
}

export function loadSnapshotsForWorkspace(workspaceId: string): ReadmeSnapshot[] {
  return loadSnapshots().filter((s) => s.workspaceId === workspaceId)
}

export function addSnapshot(entry: Omit<ReadmeSnapshot, 'id' | 'createdAt'> & { name: string; content: string }) {
  const list = readAll()
  const snap: ReadmeSnapshot = {
    ...entry,
    id: `snap_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    createdAt: new Date().toISOString(),
  }
  list.unshift(snap)
  writeAll(list.slice(0, 200))
  return snap
}

export function removeSnapshot(id: string) {
  writeAll(readAll().filter((s) => s.id !== id))
}

export function getSnapshot(id: string): ReadmeSnapshot | undefined {
  return readAll().find((s) => s.id === id)
}

const DRAFT_KEY = 'readme-studio:draft-restore'

export function stashDraftForEditor(content: string, sourcesUsed: string[]) {
  sessionStorage.setItem(DRAFT_KEY, JSON.stringify({ content, sourcesUsed, t: Date.now() }))
}

export function consumeDraftRestore(): { content: string; sourcesUsed: string[] } | null {
  try {
    const raw = sessionStorage.getItem(DRAFT_KEY)
    if (!raw) return null
    sessionStorage.removeItem(DRAFT_KEY)
    const j = JSON.parse(raw) as { content?: string; sourcesUsed?: string[] }
    if (!j.content) return null
    return { content: j.content, sourcesUsed: j.sourcesUsed ?? [] }
  } catch {
    return null
  }
}
