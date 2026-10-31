import { CheckIcon, ChevronsUpDownIcon } from 'lucide-react'
import { PlusIcon } from '@animateicons/react/lucide/plus-icon'
import { AnimatedIcon } from '@/components/ui/animated-icon'
import type { WorkspaceSummary } from '@repo/api'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Avatar } from '@/components/ui/avatar'
import { canManageWorkspace } from '@/helpers/roles'
import { avatarImage } from '@/services/avatars/avatars'
import { SIDEBAR_MENU_TRIGGER } from './sidebar-styles'

export function WorkspaceSwitcher({
  workspace,
  workspaces,
  onSwitch,
  onCreate,
}: {
  workspace: WorkspaceSummary
  workspaces: WorkspaceSummary[]
  onSwitch: (slug: string) => void
  onCreate: () => void
}) {
  const managed = workspaces.filter((option) => canManageWorkspace(option.role))
  const joined = workspaces.filter((option) => !canManageWorkspace(option.role))
  const group = (label: string, options: WorkspaceSummary[]) =>
    options.length > 0 && (
      <DropdownMenuGroup>
        <DropdownMenuLabel>{label}</DropdownMenuLabel>
        {options.map((option) => (
          <DropdownMenuItem
            key={option.id}
            onClick={() => onSwitch(option.slug)}
            aria-current={option.id === workspace.id ? 'true' : undefined}
          >
            <Avatar name={option.name} seed={option.id} image={avatarImage(option.avatarId)} size="xs" className="rounded-md" />
            <span className="min-w-0 flex-1 truncate">{option.name}</span>
            {option.id === workspace.id && <CheckIcon aria-hidden className="text-foreground" />}
          </DropdownMenuItem>
        ))}
      </DropdownMenuGroup>
    )

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label={`${workspace.name}, switch workspace`}
        className={SIDEBAR_MENU_TRIGGER}
      >
        <Avatar name={workspace.name} seed={workspace.id} image={avatarImage(workspace.avatarId)} size="sm" className="rounded-md" />
        <span className="min-w-0 flex-1 truncate text-sm font-semibold text-foreground">{workspace.name}</span>
        <ChevronsUpDownIcon aria-hidden className="size-4 shrink-0 text-muted-foreground" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" sideOffset={4} className="w-60">
        {group('You manage', managed)}
        {managed.length > 0 && joined.length > 0 && <DropdownMenuSeparator />}
        {group('Member of', joined)}
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={onCreate}>
          <AnimatedIcon icon={PlusIcon} />
          New workspace
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
