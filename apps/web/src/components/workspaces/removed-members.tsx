import { UserXIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/ui/empty-state'
import type { RemovedMember } from '@/types/api'
import { PersonLabel } from './members-list'

export function RemovedMembers({ removed, onReadmit }: { removed: RemovedMember[]; onReadmit: (person: RemovedMember) => void }) {
  if (removed.length === 0) {
    return (
      <EmptyState
        icon={UserXIcon}
        headingLevel={3}
        title="Nobody has been removed"
        description="When you remove someone, they show here. Invite links won’t let them back in until you allow it."
        className="rounded-xl border border-dashed"
      />
    )
  }

  return (
    <>
      <p className="mb-3 text-sm text-muted-foreground">
        Invite links won’t let these people back in. Letting someone back in doesn’t add them: they still need an invite.
      </p>
      <ul aria-label="Removed people" className="divide-y rounded-xl border">
        {removed.map((person) => (
          <li key={person.userId} className="flex items-center gap-3 px-4 py-3">
            <div className="min-w-0 flex-1">
              <PersonLabel name={person.name} email={person.email} seed={person.userId} />
            </div>
            <span className="hidden text-xs text-muted-foreground tabular-nums sm:block">
              Removed {new Date(person.removedAt).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })}
            </span>
            <Button variant="outline" size="sm" aria-label={`Let ${person.name} back in`} onClick={() => onReadmit(person)}>
              Let back in
            </Button>
          </li>
        ))}
      </ul>
    </>
  )
}
