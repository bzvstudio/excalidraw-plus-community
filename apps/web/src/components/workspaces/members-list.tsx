import { EllipsisIcon, UserCogIcon, UserMinusIcon } from 'lucide-react'
import { useMemo } from 'react'
import { Avatar } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { sortMembers } from '@/helpers/members'
import { avatarImage } from '@/services/avatars/avatars'
import type { WorkspaceMember } from '@/types/api'
import { RoleBadge } from './role-badge'

export function PersonLabel({
  name,
  email,
  seed,
  image,
  isYou = false,
}: {
  name: string
  email: string
  seed: string
  image?: string
  isYou?: boolean
}) {
  return (
    <div className="flex min-w-0 items-center gap-3">
      <Avatar name={name} seed={seed} image={image} />
      <div className="min-w-0">
        <p className="flex items-center gap-1.5">
          <span className="truncate font-medium text-foreground">{name}</span>
          {isYou && <span className="shrink-0 text-xs text-muted-foreground">(you)</span>}
        </p>
        <p className="truncate text-xs text-muted-foreground">{email}</p>
      </div>
    </div>
  )
}

export function MembersList({
  members,
  currentUserId,
  canManage,
  onChangeRole,
  onRemove,
}: {
  members: WorkspaceMember[]
  currentUserId: string
  canManage: boolean
  onChangeRole: (member: WorkspaceMember) => void
  onRemove: (member: WorkspaceMember) => void
}) {
  const sorted = useMemo(() => sortMembers(members), [members])

  return (
    <ul aria-label="Members" className="divide-y rounded-xl border">
      {sorted.map((member) => {
        const isYou = member.userId === currentUserId
        return (
          <li key={member.userId} className="flex items-center gap-3 px-4 py-3">
            <div className="min-w-0 flex-1">
              <PersonLabel name={member.name} email={member.email} seed={member.userId} image={avatarImage(member.avatarId)} isYou={isYou} />
            </div>
            <span className="hidden text-xs text-muted-foreground tabular-nums md:block">
              Joined {new Date(member.joinedAt).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })}
            </span>
            <div className="flex w-16 justify-end">
              <RoleBadge role={member.role} />
            </div>
            {canManage && (
              <div className="w-8 shrink-0">
                {!isYou && (
                  <MemberMenu member={member} onChangeRole={() => onChangeRole(member)} onRemove={() => onRemove(member)} />
                )}
              </div>
            )}
          </li>
        )
      })}
    </ul>
  )
}

function MemberMenu({ member, onChangeRole, onRemove }: { member: WorkspaceMember; onChangeRole: () => void; onRemove: () => void }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger render={<Button variant="ghost" size="icon" aria-label={`Actions for ${member.name}`} />}>
        <EllipsisIcon aria-hidden />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={onChangeRole}>
          <UserCogIcon aria-hidden />
          Change role…
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem variant="destructive" onClick={onRemove}>
          <UserMinusIcon aria-hidden />
          Remove from workspace…
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

