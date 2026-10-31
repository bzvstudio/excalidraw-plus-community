import { createContext, useContext } from 'react'

export type ShellActions = { openPalette: () => void }

export const ShellContext = createContext<ShellActions | null>(null)

export function useShell(): ShellActions | null {
  return useContext(ShellContext)
}
