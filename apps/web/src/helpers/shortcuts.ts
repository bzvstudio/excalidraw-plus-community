const COMMENT_KEY = 'c'

export type SearchShortcut = 'open-palette' | 'swallow'

export function togglesSidebar(event: KeyboardEvent): boolean {
  if (event.key !== '\\' && event.code !== 'Backslash') return false
  if (!(event.metaKey || event.ctrlKey) || event.altKey || event.shiftKey || event.repeat || event.isComposing || event.defaultPrevented) return false
  return !isTyping(event.target) && !insideMenuOrDialog(event.target)
}

export function addsComment(event: KeyboardEvent): boolean {
  return isBareKey(event, COMMENT_KEY)
}

function isBareKey(event: KeyboardEvent, key: string): boolean {
  if (event.key.toLowerCase() !== key || event.repeat || event.isComposing || event.defaultPrevented) return false
  if (event.metaKey || event.ctrlKey || event.altKey || event.shiftKey) return false
  const target = event.target
  if (!(target instanceof Element)) return true
  return !isTyping(target) && !insideMenuOrDialog(target)
}

function insideMenuOrDialog(target: EventTarget | null): boolean {
  return target instanceof Element && target.closest('[role=menu],[role=dialog]') !== null
}

export function opensPalette(event: KeyboardEvent, onCanvas = false): boolean {
  const key = event.key.toLowerCase()
  if (key !== 'p' && (key !== 'k' || onCanvas)) return false
  return (event.metaKey || event.ctrlKey) && !event.altKey && !event.shiftKey && !event.isComposing
}

export function searchShortcut(
  event: KeyboardEvent,
  { onCanvas, inDialog }: { onCanvas: boolean; inDialog: boolean },
): SearchShortcut | undefined {
  if (!opensPalette(event, onCanvas)) return undefined
  if (inDialog) return 'swallow'
  return event.repeat ? 'swallow' : 'open-palette'
}

export function isTyping(target: EventTarget | null): boolean {
  return target instanceof HTMLElement && (target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName))
}
