import { XIcon } from 'lucide-react'
import { type ReactNode, useEffect, useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet'

function PanelHeader({ actions, onClose, titleElement }: { actions?: ReactNode; onClose: () => void; titleElement: ReactNode }) {
  return (
    <div className="flex h-12 shrink-0 items-center gap-2 border-b pr-2 pl-4">
      {titleElement}
      <div className="ml-auto flex items-center gap-1">
        {actions}
        <Button variant="ghost" size="icon-sm" aria-label="Close panel" className="text-muted-foreground hover:text-foreground" onClick={onClose}>
          <XIcon aria-hidden />
        </Button>
      </div>
    </div>
  )
}

function DockedPanel({
  id,
  title,
  autoFocus,
  actions,
  returnFocus,
  onClose,
  children,
}: {
  id: string
  title: string
  autoFocus: boolean
  actions?: ReactNode
  returnFocus: () => HTMLElement | null
  onClose: () => void
  children: ReactNode
}) {
  const panel = useRef<HTMLElement>(null)
  const [focusOnMount] = useState(autoFocus)

  useEffect(() => {
    if (focusOnMount) panel.current?.focus()
  }, [focusOnMount])

  const close = () => {
    const target = returnFocus()
    onClose()
    requestAnimationFrame(() => target?.focus())
  }

  return (
    <aside
      ref={panel}
      id={id}
      aria-label={title}
      tabIndex={-1}
      onKeyDown={(event) => {
        if (event.key !== 'Escape' || event.defaultPrevented) return
        event.preventDefault()
        event.stopPropagation()
        close()
      }}
      className="flex w-80 shrink-0 flex-col border-l bg-background outline-none duration-200 ease-out animate-in fade-in-0 slide-in-from-right-4 motion-reduce:animate-none"
    >
      <PanelHeader actions={actions} onClose={close} titleElement={<h2 className="text-sm font-semibold">{title}</h2>} />
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">{children}</div>
    </aside>
  )
}

export function ScenePanel({
  id,
  title,
  open,
  docked,
  autoFocus,
  actions,
  returnFocus,
  onClose,
  children,
}: {
  id: string
  title: string
  open: boolean
  docked: boolean
  autoFocus: boolean
  actions?: ReactNode
  returnFocus: () => HTMLElement | null
  onClose: () => void
  children: ReactNode
}) {
  if (docked) {
    if (!open) return null
    return (
      <DockedPanel id={id} title={title} autoFocus={autoFocus} actions={actions} returnFocus={returnFocus} onClose={onClose}>
        {children}
      </DockedPanel>
    )
  }

  return (
    <Sheet open={open} onOpenChange={(next) => !next && onClose()}>
      <SheetContent id={id} side="right" showCloseButton={false} finalFocus={() => returnFocus() ?? true} className="gap-0 p-0">
        <PanelHeader actions={actions} onClose={onClose} titleElement={<SheetTitle className="text-sm">{title}</SheetTitle>} />
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">{children}</div>
      </SheetContent>
    </Sheet>
  )
}
