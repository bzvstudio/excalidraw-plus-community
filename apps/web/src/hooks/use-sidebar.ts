import { useSyncExternalStore } from 'react'

const WIDE_QUERY = '(min-width: 768px)'

const COLLAPSED_KEY = 'sidebar-collapsed'

export const SIDEBAR_ID = 'shell-sidebar'

export const SIDEBAR_TOGGLE_SELECTOR = '[data-shell-toggle]'

export const SIDEBAR_MENU_SELECTOR = '[data-shell-menu]'

export const SIDEBAR_SHEET_SELECTOR = '[data-shell-sheet]'

const COLLECTIONS_CLOSED_KEY = 'sidebar-collections-closed'

const listeners = new Set<() => void>()

let collapsed = read(COLLAPSED_KEY)

let collectionsOpen = !read(COLLECTIONS_CLOSED_KEY)

let sheetOpen = false

function read(key: string): boolean {
  try {
    return window.localStorage.getItem(key) === 'true'
  } catch {
    return false
  }
}

function write(key: string, value: boolean): void {
  try {
    window.localStorage.setItem(key, String(value))
  } catch {
    return
  }
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

function emit(): void {
  listeners.forEach((listener) => listener())
}

export function isWide(): boolean {
  return typeof window.matchMedia === 'function' && window.matchMedia(WIDE_QUERY).matches
}

function subscribeToWidth(listener: () => void): () => void {
  if (typeof window.matchMedia !== 'function') return () => undefined
  const media = window.matchMedia(WIDE_QUERY)
  media.addEventListener('change', listener)
  return () => media.removeEventListener('change', listener)
}

export function useWide(): boolean {
  return useSyncExternalStore(subscribeToWidth, isWide)
}

export function setSidebarCollapsed(next: boolean): void {
  if (next === collapsed) return
  if (next && document.activeElement?.closest(`#${SIDEBAR_ID}`)) {
    document.querySelector<HTMLElement>(SIDEBAR_TOGGLE_SELECTOR)?.focus()
  }
  collapsed = next
  write(COLLAPSED_KEY, next)
  emit()
}

export function setCollectionsOpen(next: boolean): void {
  if (next === collectionsOpen) return
  collectionsOpen = next
  write(COLLECTIONS_CLOSED_KEY, !next)
  emit()
}

export function setSidebarSheetOpen(next: boolean): void {
  if (next === sheetOpen) return
  sheetOpen = next
  emit()
}

export function toggleSidebar(): void {
  if (isWide()) setSidebarCollapsed(!collapsed)
  else setSidebarSheetOpen(!sheetOpen)
}

export function useSidebarCollapsed(): boolean {
  return useSyncExternalStore(subscribe, () => collapsed)
}

export function useSidebarSheetOpen(): boolean {
  return useSyncExternalStore(subscribe, () => sheetOpen)
}

export function useCollectionsOpen(): boolean {
  return useSyncExternalStore(subscribe, () => collectionsOpen)
}
