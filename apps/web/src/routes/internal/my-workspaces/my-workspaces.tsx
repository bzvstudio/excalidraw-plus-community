import { useQuery } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import { ChevronRightIcon, PlusIcon, SettingsIcon } from 'lucide-react'
import { SettingsHeading, SettingsNote } from '@/components/settings/settings-section'
import { Avatar } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { buttonVariants } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { RoleBadge } from '@/components/workspaces/role-badge'
import { countLabel } from '@/helpers/home'
import { newWorkspaceLink, settingsLink, workspaceLink } from '@/helpers/places'
import { settingsPage } from '@/helpers/settings-pages'
import { useWorkspace } from '@/hooks/use-workspace'
import { cn } from '@/lib/utils'
import { avatarImage } from '@/services/avatars/avatars'
import { trpc } from '@/trpc'
import type { WorkspaceListItem } from '@/types/api'

const PAGE = settingsPage('account-workspaces')

export function MyWorkspacesRoute() {
  const { workspace } = useWorkspace()
  const workspaces = useQuery(trpc.workspaces.list.queryOptions()).data ?? []
  return <MyWorkspacesPage workspaces={workspaces} currentId={workspace.id} />
}

export function MyWorkspacesPage({ workspaces, currentId }: { workspaces: WorkspaceListItem[]; currentId: string }) {
  const sorted = [...workspaces].sort((a, b) => a.name.localeCompare(b.name))

  return (
    <>
      <SettingsHeading
        title={PAGE.label}
        description={PAGE.description}
        actions={
          <Link {...newWorkspaceLink()} className={buttonVariants({ variant: 'outline' })}>
            <PlusIcon aria-hidden />
            New workspace
          </Link>
        }
      />
      <ul aria-label="Your workspaces" className="divide-y rounded-xl border">
        {sorted.map((option) => {
          const current = option.id === currentId
          return (
            <li key={option.id} className="relative flex items-center gap-3 px-4 py-3 transition-colors duration-150 hover:bg-muted/50 motion-reduce:transition-none">
              <Avatar name={option.name} seed={option.id} image={avatarImage(option.avatarId)} className="rounded-lg" />
              <div className="min-w-0 flex-1">
                <p className="flex items-center gap-2">
                  <Link
                    {...workspaceLink(option.slug)}
                    className="truncate rounded-sm font-medium text-foreground outline-none after:absolute after:inset-0 focus-visible:ring-3 focus-visible:ring-ring"
                  >
                    {option.name}
                  </Link>
                  {current && <Badge variant="outline">Current</Badge>}
                </p>
                <p className="truncate text-xs text-muted-foreground tabular-nums">
                  {countLabel(option.memberCount, 'member', 'members')} · since{' '}
                  {new Date(option.createdAt).toLocaleDateString(undefined, { month: 'short', year: 'numeric' })}
                </p>
              </div>
              <RoleBadge role={option.role} />
              <Tooltip>
                <TooltipTrigger
                  render={
                    <Link
                      {...settingsLink(option.slug)}
                      aria-label={`Settings of ${option.name}`}
                      className={cn(buttonVariants({ variant: 'ghost', size: 'icon' }), 'relative z-10')}
                    />
                  }
                >
                  <SettingsIcon aria-hidden />
                </TooltipTrigger>
                <TooltipContent>Settings</TooltipContent>
              </Tooltip>
              <ChevronRightIcon aria-hidden className="size-4 shrink-0 text-muted-foreground" />
            </li>
          )
        })}
      </ul>
      <SettingsNote>To leave a workspace, ask one of its admins to remove you.</SettingsNote>
    </>
  )
}
