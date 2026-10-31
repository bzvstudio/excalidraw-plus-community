import { type RefObject, useEffect, useLayoutEffect, useRef } from 'react'

const SETTLE_MS = 600

const POPUPS = '[role=dialog],[role=alertdialog],[role=menu]'

export function neighbourOf(previous: readonly string[], current: readonly string[], removed: string): string | undefined {
  const index = previous.indexOf(removed)
  if (index < 0) return undefined
  const present = new Set(current)
  return previous.slice(index + 1).find((id) => present.has(id)) ?? previous.slice(0, index).findLast((id) => present.has(id))
}

function settleFocus(find: () => HTMLElement | null, lost: (active: Element) => boolean = () => false) {
  const until = performance.now() + SETTLE_MS
  const step = () => {
    const target = find()
    if (target?.isConnected) {
      const active = document.activeElement
      if (!active || active === document.body || lost(active)) target.focus()
      else if (active !== target && !active.closest(POPUPS)) return
    }
    if (performance.now() < until) requestAnimationFrame(step)
  }
  step()
}

export function rowKeys(container: HTMLElement | null): string[] {
  return container ? [...container.querySelectorAll<HTMLElement>('[data-row-key]')].map((row) => row.dataset.rowKey ?? '') : []
}

export function focusAfterRow(container: HTMLElement | null, order: readonly string[], removed: string): void {
  settleFocus(() => {
    if (!container) return null
    const present = [...container.querySelectorAll<HTMLElement>('[data-row-key]')]
      .filter((row) => row.dataset.rowKey !== removed && row.querySelector('[data-row-action]'))
      .map((row) => row.dataset.rowKey ?? '')
    const next = neighbourOf(order, present, removed)
    return (
      (next && container.querySelector<HTMLElement>(`[data-row-key="${next}"] [data-row-action]`)) ||
      document.querySelector<HTMLElement>('[data-focus-fallback]')
    )
  }, (active) => active.closest(`[data-row-key="${removed}"]`) !== null)
}

export function useFocusAfterRemoval(container: RefObject<HTMLElement | null>, ids: readonly string[]) {
  const previous = useRef(ids)
  const lastFocused = useRef<string | undefined>(undefined)

  useEffect(() => {
    const element = container.current
    if (!element) return
    const onFocus = (event: FocusEvent) => {
      const item = (event.target as HTMLElement).closest<HTMLElement>('[data-scene-id]')
      lastFocused.current = item?.dataset.sceneId
    }
    element.addEventListener('focusin', onFocus)
    return () => element.removeEventListener('focusin', onFocus)
  }, [container])

  useLayoutEffect(() => {
    const before = previous.current
    previous.current = ids
    const removed = lastFocused.current
    const element = container.current
    if (!removed || !element || ids.includes(removed) || !before.includes(removed)) return
    const next = neighbourOf(before, ids, removed)
    lastFocused.current = next
    const target =
      (next && element.querySelector<HTMLElement>(`[data-scene-id="${next}"] a`)) ||
      element.querySelector<HTMLElement>('[data-focus-fallback]')
    if (target) settleFocus(() => target)
  }, [container, ids])
}
