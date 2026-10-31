import { Outlet } from '@tanstack/react-router'
import type { ReactNode } from 'react'
import { MoonIcon, SunIcon } from 'lucide-react'
import { Logo } from '@/components/brand/logo'
import { setThemePreference, useTheme } from '@/hooks/use-theme'
import { useRuntimeConfig } from '@/services/config/config'

export function AuthFrame() {
  return (
    <AuthFrameLayout>
      <Outlet />
    </AuthFrameLayout>
  )
}

export function AuthFrameLayout({ children }: { children: ReactNode }) {
  const { productName } = useRuntimeConfig()
  const { colorScheme } = useTheme()
  const ThemeIcon = colorScheme === 'dark' ? SunIcon : MoonIcon

  return (
    <div className="flex min-h-dvh flex-col bg-sidebar">
      <header className="flex items-center justify-between gap-4 p-4 sm:p-6">
        <Logo name={productName} className="min-w-0" />
        <button
          type="button"
          aria-label={colorScheme === 'dark' ? 'Use the light theme' : 'Use the dark theme'}
          onClick={() => setThemePreference(colorScheme === 'dark' ? 'light' : 'dark')}
          className="flex size-9 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-colors duration-150 outline-none hover:bg-sidebar-accent hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring motion-reduce:transition-none"
        >
          <ThemeIcon aria-hidden className="size-4" />
        </button>
      </header>
      <main className="flex flex-1 items-start justify-center px-4 pt-6 pb-10 sm:items-center sm:py-6">
        {children}
      </main>
      <footer className="px-4 pt-2 pb-6 text-center text-xs text-pretty text-muted-foreground">
        Self-hosted. Your accounts and drawings stay on this server.
      </footer>
    </div>
  )
}
