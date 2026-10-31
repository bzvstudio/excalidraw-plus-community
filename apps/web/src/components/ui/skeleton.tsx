import * as React from "react"
import { cn } from "cn"
import { SKELETON_DELAY_MS, useDelayedVisibility } from "@/hooks/use-delayed-visibility"

function Skeleton({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      aria-hidden
      data-slot="skeleton"
      className={cn(
        "animate-shimmer rounded-md bg-muted bg-[linear-gradient(90deg,transparent_0%,color-mix(in_oklch,var(--foreground)_7%,transparent)_50%,transparent_100%)] bg-size-[200%_100%] bg-no-repeat motion-reduce:animate-none motion-reduce:bg-none",
        className
      )}
      {...props}
    />
  )
}

function DelayedSkeleton({
  delay = SKELETON_DELAY_MS,
  label = "Loading",
  className,
  children,
}: {
  delay?: number
  label?: string
  className?: string
  children: React.ReactNode
}) {
  const visible = useDelayedVisibility(delay)
  return (
    <div role="status" aria-live="polite" aria-busy className={className}>
      <span className="sr-only">{label}</span>
      {visible && <div className="animate-in fade-in-0 duration-150 motion-reduce:animate-none">{children}</div>}
    </div>
  )
}

export { DelayedSkeleton, Skeleton }
