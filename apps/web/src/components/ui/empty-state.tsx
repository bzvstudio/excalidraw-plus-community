import * as React from "react"
import { cn } from "cn"

function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  headingLevel = 2,
  className,
}: {
  icon: React.ComponentType<{ className?: string; "aria-hidden"?: boolean }>
  title: string
  description?: React.ReactNode
  action?: React.ReactNode
  headingLevel?: 2 | 3
  className?: string
}) {
  const Heading = headingLevel === 2 ? "h2" : "h3"
  return (
    <div
      data-slot="empty-state"
      className={cn("flex flex-col items-center justify-center gap-4 px-6 py-12 text-center", className)}
    >
      <span className="flex size-10 items-center justify-center rounded-xl bg-muted text-muted-foreground">
        <Icon aria-hidden className="size-5" />
      </span>
      <div className="flex max-w-sm flex-col gap-1">
        <Heading className="text-sm font-semibold text-foreground">{title}</Heading>
        {description && <p className="text-sm text-pretty text-muted-foreground">{description}</p>}
      </div>
      {action}
    </div>
  )
}

export { EmptyState }
