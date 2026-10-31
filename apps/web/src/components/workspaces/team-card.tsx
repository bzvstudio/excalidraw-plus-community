import { EllipsisIcon, FolderIcon, PencilIcon, PlusIcon, Trash2Icon, XIcon } from 'lucide-react'
import { Avatar } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { countLabel } from '@/helpers/home'
import { avatarImage } from '@/services/avatars/avatars'
import type { Collection, Team, WorkspaceMember } from '@/types/api'

export function TeamCard({
  team,
  members,
  keptTo,
  canManage,
  onRename,
  onDelete,
  onAddMember,
  onRemoveMember,
}: {
  team: Team
  members: WorkspaceMember[]
  keptTo: Collection[]
  canManage: boolean
  onRename: () => void
  onDelete: () => void
  onAddMember: (member: WorkspaceMember) => void
  onRemoveMember: (member: WorkspaceMember) => void
}) {
  const inTeam = members.filter((member) => team.memberIds.includes(member.userId))
  const candidates = members.filter((member) => !team.memberIds.includes(member.userId))

  return (
    <article aria-labelledby={`team-${team.id}`} data-row-key={team.id} className="flex flex-col rounded-xl border bg-card">
      <header className="flex items-center gap-3 px-4 pt-3.5 pb-3">
        <div className="min-w-0 flex-1">
          <h3 id={`team-${team.id}`} className="truncate text-sm font-semibold text-foreground">
            {team.name}
          </h3>
          <p className="text-xs text-muted-foreground tabular-nums">{countLabel(inTeam.length, 'person', 'people')}</p>
        </div>
        {canManage && (
          <DropdownMenu>
            <DropdownMenuTrigger render={<Button variant="ghost" size="icon-sm" data-row-action aria-label={`Actions for ${team.name}`} />}>
              <EllipsisIcon aria-hidden />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={onRename}>
                <PencilIcon aria-hidden />
                Rename…
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem variant="destructive" onClick={onDelete}>
                <Trash2Icon aria-hidden />
                Delete team…
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </header>
      <div className="flex flex-col gap-2 px-4 pb-4">
        <h4 className="text-xs font-medium text-muted-foreground">People</h4>
        <ul aria-label={`People in ${team.name}`} className="flex flex-wrap gap-1.5">
          {inTeam.length === 0 && <li className="text-sm text-muted-foreground">Nobody yet.</li>}
          {inTeam.map((member) => (
            <li key={member.userId} className="flex h-7 items-center gap-1.5 rounded-full border pr-1 pl-0.5 text-sm text-foreground">
              <Avatar name={member.name} seed={member.userId} image={avatarImage(member.avatarId)} size="sm" />
              <span className="max-w-40 truncate">{member.name}</span>
              {canManage ? (
                <Button
                  variant="ghost"
                  size="icon-xs"
                  className="size-5 rounded-full"
                  aria-label={`Take ${member.name} out of ${team.name}`}
                  onClick={() => onRemoveMember(member)}
                >
                  <XIcon aria-hidden />
                </Button>
              ) : (
                <span className="w-1" />
              )}
            </li>
          ))}
          {canManage && candidates.length > 0 && (
            <li>
              <DropdownMenu>
                <DropdownMenuTrigger render={<Button variant="outline" size="xs" className="h-7 rounded-full border-dashed" />}>
                  <PlusIcon aria-hidden />
                  Add person
                </DropdownMenuTrigger>
                <DropdownMenuContent className="max-h-72">
                  {candidates.map((member) => (
                    <DropdownMenuItem key={member.userId} onClick={() => onAddMember(member)}>
                      <Avatar name={member.name} seed={member.userId} image={avatarImage(member.avatarId)} size="xs" />
                      {member.name}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            </li>
          )}
        </ul>
      </div>
      <div className="mt-auto flex flex-col gap-2 border-t px-4 py-3">
        <h4 className="text-xs font-medium text-muted-foreground">Collections kept to this team</h4>
        {keptTo.length === 0 ? (
          <p className="text-sm text-muted-foreground">None. The team sees what everyone sees.</p>
        ) : (
          <ul aria-label={`Collections kept to ${team.name}`} className="flex flex-wrap gap-x-4 gap-y-1">
            {keptTo.map((collection) => (
              <li key={collection.id} className="flex min-w-0 items-center gap-1.5 text-sm text-foreground">
                <FolderIcon aria-hidden className="size-3.5 shrink-0 text-muted-foreground" />
                <span className="truncate">{collection.name}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </article>
  )
}
