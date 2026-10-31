import { CheckIcon, CloudOffIcon, LoaderCircleIcon, TriangleAlertIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

export type SaveStatus = 'saved' | 'saving' | 'offline' | 'failed'

const LABELS: Record<SaveStatus, string> = {
  saved: 'Saved',
  saving: 'Saving…',
  offline: 'Offline — changes kept',
  failed: 'Not saved',
}

const ICONS = { saved: CheckIcon, saving: LoaderCircleIcon, offline: CloudOffIcon, failed: TriangleAlertIcon }

export function SaveStatusBadge({
  status,
  failure,
  onRetry,
}: {
  status: SaveStatus
  failure?: string
  onRetry: () => void
}) {
  const trouble = status === 'failed' || status === 'offline'
  const Icon = ICONS[status]

  return (
    <span className="flex min-w-0 items-center gap-1.5 text-xs leading-4 whitespace-nowrap">
      <span
        role="status"
        title={failure}
        className={cn(
          'flex min-w-0 items-center gap-1 text-muted-foreground',
          status === 'offline' && 'text-warning-foreground',
          status === 'failed' && 'text-destructive',
        )}
      >
        <Icon aria-hidden className={cn('size-3.5 shrink-0', status === 'saving' && 'animate-spin motion-reduce:animate-none')} />
        <span className={cn('truncate', !trouble && 'md:max-lg:sr-only')}>
          {LABELS[status]}
          {failure && <span className="max-md:sr-only">: {failure}</span>}
        </span>
      </span>
      {trouble && (
        <button
          type="button"
          onClick={onRetry}
          className="rounded-sm font-medium text-foreground underline decoration-foreground/30 underline-offset-2 outline-none hover:decoration-foreground focus-visible:ring-3 focus-visible:ring-ring"
        >
          Retry now
        </button>
      )}
    </span>
  )
}
