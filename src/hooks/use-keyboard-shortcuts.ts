import { useEffect, useRef } from 'react'

export type ShortcutCombo = {
  key: string
  ctrlOrMeta: boolean
  shift?: boolean
  action: () => void
}

export function useKeyboardShortcuts(combos: ShortcutCombo[], enabled = true) {
  const ref = useRef(combos)
  ref.current = combos

  useEffect(() => {
    if (!enabled) return

    function onKey(e: KeyboardEvent) {
      const target = e.target as HTMLElement
      const inField =
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.tagName === 'SELECT' ||
        target.isContentEditable

      for (const c of ref.current) {
        if (c.ctrlOrMeta && !(e.metaKey || e.ctrlKey)) continue
        if (!c.ctrlOrMeta && (e.metaKey || e.ctrlKey)) continue
        if (c.shift === true && !e.shiftKey) continue
        if (c.shift === false && e.shiftKey) continue

        if (e.key.toLowerCase() !== c.key.toLowerCase()) continue

        if (inField && !c.ctrlOrMeta) continue

        e.preventDefault()
        c.action()
        break
      }
    }

    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [enabled])
}

export const GENERATOR_SHORTCUT_HELP: { keys: string; description: string }[] = [
  { keys: '⌘/Ctrl + S', description: 'Save named snapshot (local)' },
  { keys: '⌘/Ctrl + Shift + C', description: 'Copy markdown' },
  { keys: '⌘/Ctrl + D', description: 'Download .md' },
  { keys: '⌘/Ctrl + 1 … 4', description: 'Jump to wizard steps' },
  { keys: '?', description: 'Show shortcuts (when not typing)' },
]
