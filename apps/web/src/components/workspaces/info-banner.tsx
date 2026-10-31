import { InfoIcon } from 'lucide-react'
import type { ReactNode } from 'react'

export function InfoBanner({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div
      role="note"
      className="mb-6 flex items-start gap-3 rounded-xl bg-info p-4 text-info-foreground"
    >
      <InfoIcon aria-hidden className="mt-0.5 size-4 shrink-0" />
      <div className="flex-1">
        <p className="mb-1 text-sm font-medium">{title}</p>
        <p className="text-sm text-info-foreground/85">{children}</p>
      </div>
    </div>
  )
}
