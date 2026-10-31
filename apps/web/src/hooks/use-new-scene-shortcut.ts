import { useEffect, useRef } from 'react'

function pressesA(event: KeyboardEvent): boolean {
  return event.key.toLowerCase() === 'a' || (event.key === 'å' && event.code === 'KeyA')
}

export function useNewSceneShortcut(onNewScene: (() => void) | undefined): void {
  const latest = useRef(onNewScene)

  useEffect(() => {
    latest.current = onNewScene
  })

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (!event.altKey || event.metaKey || event.ctrlKey || event.shiftKey || event.repeat || !pressesA(event)) return
      if (event.target instanceof Element && event.target.closest('input,textarea,select,[contenteditable],[role=dialog],[role=menu]')) return
      if (!latest.current) return
      event.preventDefault()
      latest.current()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])
}
