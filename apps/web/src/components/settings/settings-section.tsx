import { type ReactNode, useId } from 'react'
import { PageTitle } from '@/components/ui/page-header'
import { cn } from '@/lib/utils'

export function SettingsHeading({ title, description, actions }: { title: string; description: ReactNode; actions?: ReactNode }) {
  return (
    <header className="mb-6 flex flex-wrap items-start justify-between gap-x-6 gap-y-4">
      <div className="flex min-w-0 flex-col gap-1">
        <PageTitle tabIndex={-1} data-focus-fallback className="text-xl outline-none">
          {title}
        </PageTitle>
        <p className="max-w-xl text-sm text-pretty text-muted-foreground">{description}</p>
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2 max-sm:w-full max-sm:*:flex-1">{actions}</div>}
    </header>
  )
}

export function SettingsCard({
  title,
  description,
  action,
  footer,
  className,
  children,
}: {
  title?: string
  description?: ReactNode
  action?: ReactNode
  footer?: ReactNode
  className?: string
  children: ReactNode
}) {
  const titleId = useId()
  return (
    <section
      aria-labelledby={title ? titleId : undefined}
      className={cn('overflow-hidden rounded-xl border bg-card text-sm', className)}
    >
      {title && (
        <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2 border-b px-5 py-4">
          <div className="flex min-w-0 flex-col gap-0.5">
            <h2 id={titleId} className="text-sm font-semibold text-foreground">
              {title}
            </h2>
            {description && <p className="text-sm text-pretty text-muted-foreground">{description}</p>}
          </div>
          {action}
        </div>
      )}
      <div className="divide-y">{children}</div>
      {footer && <div className="flex items-center gap-2 border-t bg-muted/40 px-5 py-3 text-muted-foreground">{footer}</div>}
    </section>
  )
}

export function SettingsRow({
  label,
  description,
  labelId,
  descriptionId,
  className,
  children,
}: {
  label: ReactNode
  description?: ReactNode
  labelId?: string
  descriptionId?: string
  className?: string
  children?: ReactNode
}) {
  return (
    <div className={cn('flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:gap-8', className)}>
      <div className="flex min-w-0 flex-col gap-0.5">
        <span id={labelId} className="text-sm font-medium text-foreground">
          {label}
        </span>
        {description && (
          <span id={descriptionId} className="text-sm text-pretty text-muted-foreground">
            {description}
          </span>
        )}
      </div>
      {children !== undefined && <div className="flex shrink-0 items-center gap-2">{children}</div>}
    </div>
  )
}

export function SettingsNote({ children }: { children: ReactNode }) {
  return <p className="mt-3 text-xs text-pretty text-muted-foreground">{children}</p>
}

export function SettingsStack({ children }: { children: ReactNode }) {
  return <div className="flex flex-col gap-6">{children}</div>
}
