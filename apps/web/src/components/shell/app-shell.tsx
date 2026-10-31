import { type ReactNode, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet'
import { SIDEBAR_ID, SIDEBAR_MENU_SELECTOR, SIDEBAR_TOGGLE_SELECTOR } from '@/hooks/use-sidebar'
import { fadeIn } from '@/helpers/motion'
import { cn } from '@/lib/utils'

function sheetOpener(): HTMLElement | boolean {
  if (document.activeElement?.closest('[role="dialog"]:not([data-shell-sheet]), [role="alertdialog"]')) return false
  return document.querySelector<HTMLElement>(SIDEBAR_MENU_SELECTOR) ?? document.querySelector<HTMLElement>(SIDEBAR_TOGGLE_SELECTOR) ?? true
}

export function AppShell({
  sidebar,
  collapsed,
  sheetOpen,
  fullBleed = false,
  pageKey,
  keepScroll = false,
  onSheetOpenChange,
  children,
}: {
  sidebar: ReactNode
  collapsed: boolean
  sheetOpen: boolean
  fullBleed?: boolean
  pageKey: string
  keepScroll?: boolean
  onSheetOpenChange: (open: boolean) => void
  children: ReactNode
}) {
  const [animated, setAnimated] = useState(false)
  const scroller = useRef<HTMLElement>(null)
  const page = useRef<HTMLDivElement>(null)
  const shownKey = useRef(pageKey)

  useLayoutEffect(() => {
    if (shownKey.current === pageKey) return
    shownKey.current = pageKey
    if (!keepScroll) scroller.current?.scrollTo({ top: 0 })
    fadeIn(page.current)
  }, [pageKey, keepScroll])

  useEffect(() => {
    const frame = requestAnimationFrame(() => setAnimated(true))
    return () => cancelAnimationFrame(frame)
  }, [])

  if (fullBleed) return children

  const moves = animated && 'transition-[margin] duration-200 ease-out motion-reduce:transition-none'

  return (
    <div
      data-sidebar={collapsed ? 'collapsed' : 'open'}
      className="fixed inset-0 flex overflow-hidden bg-sidebar"
    >
      <aside
        id={SIDEBAR_ID}
        aria-label="Sidebar"
        inert={collapsed}
        className={cn('flex w-[248px] shrink-0 flex-col max-md:hidden', collapsed && '-ml-[248px]', moves)}
      >
        {sidebar}
      </aside>
      <main
        ref={scroller}
        className={cn(
          'relative min-w-0 flex-1 overflow-y-auto overscroll-contain bg-background md:my-2 md:mr-2 md:rounded-xl md:border',
          collapsed && 'md:ml-2',
          moves,
        )}
      >
        <div ref={page} className="flex min-h-full flex-col">
          {children}
        </div>
      </main>
      <Sheet open={sheetOpen} onOpenChange={onSheetOpenChange}>
        <SheetContent data-shell-sheet side="left" showCloseButton={false} finalFocus={sheetOpener} className="w-[min(18rem,calc(100%-3rem))] gap-0 bg-sidebar p-0">
          <SheetTitle className="sr-only">Menu</SheetTitle>
          {sidebar}
        </SheetContent>
      </Sheet>
    </div>
  )
}
