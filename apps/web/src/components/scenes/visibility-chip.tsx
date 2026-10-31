import { GlobeIcon, LockIcon, UsersIcon } from 'lucide-react'
import { badgeVariants } from '@/components/ui/badge'
import { type Visibility, visibilityText } from '@/helpers/visibility'
import { cn } from '@/lib/utils'

const ICONS = { drafts: LockIcon, everyone: GlobeIcon, teams: UsersIcon }

export function VisibilityChip({ visibility, onChange }: { visibility: Visibility; onChange?: () => void }) {
  const { label } = visibilityText(visibility)
  const Icon = ICONS[visibility.kind]
  const className = cn(
    badgeVariants({ variant: 'outline' }),
    'h-6 gap-1.5 px-2.5 font-normal text-muted-foreground',
  )

  if (!onChange) {
    return (
      <span className={className}>
        <Icon aria-hidden />
        {label}
      </span>
    )
  }

  return (
    <button
      type="button"
      onClick={onChange}
      aria-label={`${label} can see this. Change who can see it`}
      className={cn(className, 'cursor-pointer outline-none hover:bg-muted hover:text-foreground')}
    >
      <Icon aria-hidden />
      {label}
    </button>
  )
}
