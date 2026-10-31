import { Link2Icon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/ui/empty-state'
import { countLabel } from '@/helpers/home'
import type { WorkspaceInvite } from '@/types/api'
import { RoleBadge } from './role-badge'

function usesOf(invite: WorkspaceInvite): string {
  if (invite.maxUses === null) return `${countLabel(invite.uses, 'person has', 'people have')} joined · no limit`
  return `${invite.uses} of ${invite.maxUses} used`
}

function expiryOf(invite: WorkspaceInvite): string {
  return `Expires ${new Date(invite.expiresAt).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })}`
}

export function PendingInvites({ invites, onRevoke }: { invites: WorkspaceInvite[]; onRevoke: (invite: WorkspaceInvite) => void }) {
  if (invites.length === 0) {
    return (
      <EmptyState
        icon={Link2Icon}
        headingLevel={3}
        title="No invites waiting"
        description="Links you create, and invitations you email, wait here until they are used up or expire."
        className="rounded-xl border border-dashed"
      />
    )
  }

  return (
    <ul aria-label="Pending invites" className="divide-y rounded-xl border">
      {invites.map((invite) => (
        <li key={invite.id} data-row-key={invite.id} className="flex items-center gap-3 px-4 py-3">
          <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground">
            <Link2Icon aria-hidden className="size-4" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="flex items-center gap-2 font-medium text-foreground">
              Invite link
              <RoleBadge role={invite.role} />
            </p>
            <p className="truncate text-xs text-muted-foreground tabular-nums">
              {usesOf(invite)} · {expiryOf(invite)}
            </p>
          </div>
          <Button variant="outline" size="sm" data-row-action onClick={() => onRevoke(invite)}>
            Withdraw
          </Button>
        </li>
      ))}
    </ul>
  )
}
