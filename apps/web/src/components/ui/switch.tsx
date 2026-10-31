import * as React from "react"
import { cn } from "cn"

function Switch({ className, ...props }: Omit<React.ComponentProps<"input">, "type" | "role">) {
  return (
    <input
      type="checkbox"
      role="switch"
      data-slot="switch"
      className={cn(
        "relative h-5 w-9 shrink-0 cursor-pointer appearance-none rounded-full bg-input transition-colors duration-150 outline-none before:absolute before:top-0.5 before:left-0.5 before:size-4 before:rounded-full before:bg-background before:shadow-sm before:transition-transform before:duration-150 before:content-[''] checked:bg-primary checked:before:translate-x-4 checked:before:bg-primary-foreground focus-visible:ring-3 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 motion-reduce:transition-none motion-reduce:before:transition-none dark:before:bg-foreground",
        className
      )}
      {...props}
    />
  )
}

export { Switch }
