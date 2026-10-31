import { useSyncExternalStore } from 'react'

export type ColorScheme = 'light' | 'dark'

export type ThemePreference = ColorScheme | 'system'

const STORAGE_KEY = 'theme'

const DARK_QUERY = '(prefers-color-scheme: dark)'

const SWITCHING_ATTRIBUTE = 'data-switching-theme'

const listeners = new Set<() => void>()

let restoreFrame = 0

function readPreference(): ThemePreference {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    return stored === 'light' || stored === 'dark' ? stored : 'system'
  } catch {
    return 'system'
  }
}

function prefersDark(): boolean {
  return window.matchMedia(DARK_QUERY).matches
}

function subscribe(listener: () => void): () => void {
  const query = window.matchMedia(DARK_QUERY)
  listeners.add(listener)
  query.addEventListener('change', listener)
  return () => {
    listeners.delete(listener)
    query.removeEventListener('change', listener)
  }
}

export function setThemePreference(preference: ThemePreference): void {
  try {
    if (preference === 'system') localStorage.removeItem(STORAGE_KEY)
    else localStorage.setItem(STORAGE_KEY, preference)
  } catch {
    return
  } finally {
    listeners.forEach((listener) => listener())
  }
}

export function useTheme(): { preference: ThemePreference; colorScheme: ColorScheme } {
  const preference = useSyncExternalStore(subscribe, readPreference)
  const dark = useSyncExternalStore(subscribe, prefersDark)
  return { preference, colorScheme: preference === 'system' ? (dark ? 'dark' : 'light') : preference }
}

export function applyColorScheme(scheme: ColorScheme, root: HTMLElement = document.documentElement): void {
  const dark = scheme === 'dark'
  if (root.classList.contains('dark') === dark) return
  cancelAnimationFrame(restoreFrame)
  root.setAttribute(SWITCHING_ATTRIBUTE, '')
  root.classList.toggle('dark', dark)
  void getComputedStyle(root).color
  restoreFrame = requestAnimationFrame(() => {
    restoreFrame = requestAnimationFrame(() => root.removeAttribute(SWITCHING_ATTRIBUTE))
  })
}
