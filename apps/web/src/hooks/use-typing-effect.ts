import { useEffect, useState } from 'react'

export function useTypingEffect(phrases: readonly string[], typingMs = 55, pauseMs = 2200) {
  const [text, setText] = useState('')
  const [phraseIndex, setPhraseIndex] = useState(0)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    const phrase = phrases[phraseIndex] ?? ''
    let id: ReturnType<typeof setTimeout>

    if (!deleting) {
      if (text.length < phrase.length) {
        id = setTimeout(() => setText(phrase.slice(0, text.length + 1)), typingMs)
      } else {
        id = setTimeout(() => setDeleting(true), pauseMs)
      }
    } else if (text.length > 0) {
      id = setTimeout(() => setText((t) => t.slice(0, -1)), typingMs / 2)
    } else {
      id = setTimeout(() => {
        setDeleting(false)
        setPhraseIndex((i) => (i + 1) % phrases.length)
      }, 0)
    }

    return () => clearTimeout(id)
  }, [text, deleting, phraseIndex, phrases, typingMs, pauseMs])

  return text
}
