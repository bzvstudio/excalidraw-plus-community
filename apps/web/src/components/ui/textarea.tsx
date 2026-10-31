import * as React from "react"
import { cn } from "cn"
import { FIELD_CONTROL } from "@/components/ui/input"

function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(FIELD_CONTROL, "field-sizing-content min-h-16 py-2", className)}
      {...props}
    />
  )
}

export { Textarea }
