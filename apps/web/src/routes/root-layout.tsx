import { HeadContent, Outlet, useMatch } from '@tanstack/react-router'
import { useLayoutEffect } from 'react'
import { Toaster } from '@/components/ui/toaster'
import { TooltipProvider } from '@/components/ui/tooltip'
import { applyColorScheme, useTheme } from '@/hooks/use-theme'

export function RootLayout() {
  const { colorScheme: preferred } = useTheme()
  const embedded = useMatch({ from: '/external/embed', shouldThrow: false, select: (match) => match.search.theme })
  const colorScheme = embedded ?? preferred

  useLayoutEffect(() => {
    applyColorScheme(colorScheme)
  }, [colorScheme])

  return (
    <TooltipProvider>
      <div className="min-h-screen">
        <HeadContent />
        <Outlet />
      </div>
      <Toaster />
    </TooltipProvider>
  )
}
