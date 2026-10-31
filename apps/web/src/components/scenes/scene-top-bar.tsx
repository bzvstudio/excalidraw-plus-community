import type { ReactElement, ReactNode } from 'react'
import { Button } from '@/components/ui/button'
import { Kbd } from '@/components/ui/kbd'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'

export function SceneTopBar({
  leading,
  title,
  status,
  trailing,
}: {
  leading?: ReactNode
  title: ReactNode
  status?: ReactNode
  trailing?: ReactNode
}) {
  return (
    <header
      data-scene-bar
      className="relative z-10 flex h-12 shrink-0 items-center gap-2 border-b bg-canvas px-2 text-foreground md:gap-3 md:px-3"
    >
      <div className="flex min-w-0 flex-1 items-center gap-1.5 md:gap-2">
        {leading}
        <div className="flex min-w-0 flex-col justify-center md:flex-row md:items-center md:gap-3">
          {title}
          {status}
        </div>
      </div>
      {trailing && <div className="flex shrink-0 items-center gap-1 md:gap-1.5">{trailing}</div>}
    </header>
  )
}

export function SceneBarButton({
  label,
  icon,
  text,
  shortcut,
  id,
  expanded,
  controls,
  badge,
  onClick,
  disabled,
  className,
}: {
  label: string
  icon: ReactElement
  text?: string
  shortcut?: string
  id?: string
  expanded?: boolean
  controls?: string
  badge?: number
  onClick: () => void
  disabled?: boolean
  className?: string
}) {
  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <Button
            variant="ghost"
            size={text ? 'sm' : 'icon-sm'}
            id={id}
            aria-label={label}
            aria-expanded={expanded}
            aria-controls={expanded ? controls : undefined}
            disabled={disabled}
            onClick={onClick}
            className={cn(
              'relative text-muted-foreground hover:text-foreground aria-expanded:bg-accent aria-expanded:text-foreground',
              text && 'max-lg:w-8 max-lg:px-0',
              className,
            )}
          />
        }
      >
        {icon}
        {text && <span className="max-lg:hidden">{text}</span>}
        {badge !== undefined && badge > 0 && (
          <span
            aria-hidden
            className="absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] leading-none font-medium text-primary-foreground tabular-nums lg:static lg:ml-0.5 lg:bg-muted lg:text-muted-foreground"
          >
            {badge}
          </span>
        )}
      </TooltipTrigger>
      <TooltipContent side="bottom">
        {label}
        {shortcut && <Kbd>{shortcut}</Kbd>}
      </TooltipContent>
    </Tooltip>
  )
}
