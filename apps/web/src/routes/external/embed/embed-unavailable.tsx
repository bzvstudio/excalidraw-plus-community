import { ImageOffIcon } from 'lucide-react'
import { EmbedBadge } from './embed-badge'

export function EmbedUnavailable() {
  return (
    <main className="fixed inset-0 grid place-items-center bg-sidebar p-6 text-center">
      <div className="flex max-w-xs flex-col items-center gap-3">
        <span className="flex size-10 items-center justify-center rounded-xl bg-muted text-muted-foreground">
          <ImageOffIcon aria-hidden className="size-5" />
        </span>
        <div className="flex flex-col gap-1">
          <h1 className="text-sm font-semibold text-foreground">This drawing isn't shown here any more</h1>
          <p className="text-sm text-pretty text-muted-foreground">The link behind it was turned off or has run out.</p>
        </div>
      </div>
      <EmbedBadge />
    </main>
  )
}
