import { MenuIcon, PanelLeftIcon } from 'lucide-react'
import { Kbd, KbdGroup } from '@/components/ui/kbd'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { ariaChord, MOD_KEY } from '@/helpers/platform'
import {
  setSidebarCollapsed,
  setSidebarSheetOpen,
  SIDEBAR_ID,
  useSidebarCollapsed,
  useSidebarSheetOpen,
} from '@/hooks/use-sidebar'
import { cn } from '@/lib/utils'

const TOGGLE =
  'flex size-8 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-colors duration-150 outline-none hover:bg-accent hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring motion-reduce:transition-none'

export function SidebarToggle() {
  const collapsed = useSidebarCollapsed()
  const sheetOpen = useSidebarSheetOpen()
  const label = collapsed ? 'Show sidebar' : 'Hide sidebar'

  return (
    <>
      <button
        type="button"
        aria-label="Open menu"
        aria-haspopup="dialog"
        aria-expanded={sheetOpen}
        data-shell-menu
        onClick={() => setSidebarSheetOpen(true)}
        className={cn(TOGGLE, '-ml-1 md:hidden')}
      >
        <MenuIcon aria-hidden className="size-4" />
      </button>
      <Tooltip>
        <TooltipTrigger
          aria-label={label}
          aria-expanded={!collapsed}
          aria-controls={SIDEBAR_ID}
          aria-keyshortcuts={ariaChord('\\')}
          data-shell-toggle
          onClick={() => setSidebarCollapsed(!collapsed)}
          className={cn(TOGGLE, '-ml-1 max-md:hidden')}
        >
          <PanelLeftIcon aria-hidden className="size-4" />
        </TooltipTrigger>
        <TooltipContent side="bottom" align="start">
          {label}
          <KbdGroup>
            <Kbd>{MOD_KEY}</Kbd>
            <Kbd>\</Kbd>
          </KbdGroup>
        </TooltipContent>
      </Tooltip>
      <span aria-hidden className="mx-1 h-4 w-px shrink-0 bg-border" />
    </>
  )
}
