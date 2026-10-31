import * as React from "react"
import { cn } from "cn"

function PageHeader({
  actions,
  className,
  children,
  ...props
}: React.ComponentProps<"header"> & { actions?: React.ReactNode }) {
  return (
    <header
      data-slot="page-header"
      className={cn(
        "sticky top-0 z-10 flex h-12 shrink-0 items-center gap-3 border-b bg-background/85 px-4 supports-backdrop-filter:backdrop-blur-md",
        className
      )}
      {...props}
    >
      <div className="flex min-w-0 flex-1 items-center gap-2">{children}</div>
      {actions && <div className="flex shrink-0 items-center gap-1.5">{actions}</div>}
    </header>
  )
}

function PageTitle({ className, ...props }: React.ComponentProps<"h1">) {
  return (
    <h1
      data-slot="page-title"
      className={cn("truncate text-lg font-semibold tracking-tight text-foreground", className)}
      {...props}
    />
  )
}

export { PageHeader, PageTitle }
