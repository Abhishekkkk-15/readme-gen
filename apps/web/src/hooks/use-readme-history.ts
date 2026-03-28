import { useCallback, useState } from 'react'
import { addSnapshot, loadSnapshots, removeSnapshot } from '@/lib/snapshot-storage'
import type { ReadmeSnapshot } from '@/types'

export interface HistoryEntry {
  id: string
  name: string
  content: string
  createdAt: string
  modelId?: string
}

export function useReadmeHistory(workspaceId: string) {
  const [history, setHistory] = useState<ReadmeSnapshot[]>(() =>
    loadSnapshots().filter((s) => s.workspaceId === workspaceId).slice(0, 20),
  )

  const saveSnapshot = useCallback(
    (content: string, name: string, modelId?: string) => {
      const snap = addSnapshot({
        workspaceId,
        name,
        content,
        sourcesUsed: [],
        modelId,
      })
      setHistory((prev) => [snap, ...prev].slice(0, 20))
      return snap
    },
    [workspaceId],
  )

  const deleteSnapshot = useCallback((id: string) => {
    removeSnapshot(id)
    setHistory((prev) => prev.filter((s) => s.id !== id))
  }, [])

  const refresh = useCallback(() => {
    setHistory(
      loadSnapshots().filter((s) => s.workspaceId === workspaceId).slice(0, 20),
    )
  }, [workspaceId])

  return { history, saveSnapshot, deleteSnapshot, refresh }
}
