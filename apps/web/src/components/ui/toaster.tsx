import { cn } from "cn"
import { Toaster as Sonner } from "sonner"
import { buttonVariants } from "@/components/ui/button"
import { POPUP_SURFACE } from "@/components/ui/popup"
import { useTheme } from "@/hooks/use-theme"

const TOAST_DURATION_MS = 4000

function Toaster() {
  const { colorScheme } = useTheme()
  return (
    <Sonner
      theme={colorScheme}
      position="bottom-right"
      duration={TOAST_DURATION_MS}
      gap={8}
      toastOptions={{
        unstyled: true,
        classNames: {
          toast: cn(POPUP_SURFACE, "flex w-(--width) items-center gap-3 p-3 pr-4 font-sans text-sm"),
          title: "font-medium",
          description: "text-muted-foreground",
          icon: "text-muted-foreground",
          actionButton: buttonVariants({ size: "xs", className: "ml-auto" }),
          cancelButton: buttonVariants({ variant: "ghost", size: "xs" }),
        },
      }}
    />
  )
}

export { TOAST_DURATION_MS, Toaster }
