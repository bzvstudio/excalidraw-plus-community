import * as React from "react"
import { cn } from "cn"

function Checkbox({ className, ...props }: Omit<React.ComponentProps<"input">, "type">) {
  return (
    <input
      type="checkbox"
      data-slot="checkbox"
      className={cn(
        "relative size-4 shrink-0 cursor-pointer appearance-none rounded-sm border border-input bg-background transition-colors duration-150 outline-none after:absolute after:top-0.5 after:left-[5px] after:hidden after:h-2 after:w-1 after:rotate-45 after:border-r-2 after:border-b-2 after:border-primary-foreground after:content-[''] checked:border-primary checked:bg-primary checked:after:block focus-visible:ring-3 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 motion-reduce:transition-none dark:bg-input/30 dark:checked:bg-primary",
        className
      )}
      {...props}
    />
  )
}

export { Checkbox }
