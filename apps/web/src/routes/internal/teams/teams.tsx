import { TEAM_NAME_MAX_LENGTH } from '@repo/api/teams.const'
import { useQuery } from '@tanstack/react-query'
import { FolderIcon, PlusIcon, UsersIcon } from 'lucide-react'
import { useRef, useState } from 'react'
import { toast } from 'sonner'
import { NameDialog } from '@/components/name-dialog'
import { AccessDialog } from '@/components/scenes/access-dialog'
import { VisibilityChip } from '@/components/scenes/visibility-chip'
import { ConfirmDialog } from '@/components/settings/confirm-dialog'
import { SettingsCard, SettingsHeading, SettingsStack } from '@/components/settings/settings-section'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/ui/empty-state'
import { TeamCard } from '@/components/workspaces/team-card'
import { countLabel } from '@/helpers/home'
import { attempt } from '@/helpers/results'
import { canManageWorkspace } from '@/helpers/roles'
import { settingsPage } from '@/helpers/settings-pages'
import type { Visibility } from '@/helpers/visibility'
import { useConfirm } from '@/hooks/use-confirm'
import { focusAfterRow, rowKeys } from '@/hooks/use-focus-after-removal'
import { useWorkspace } from '@/hooks/use-workspace'
import { restrictCollection } from '@/services/collections/collections'
import { addTeamMember, createTeam, deleteTeam, removeTeamMember, renameTeam } from '@/services/teams/teams'
import { trpc } from '@/trpc'
import type { Collection, Team, WorkspaceMember } from '@/types/api'
import type { SubmitResult } from '@/types/forms'

const PAGE = settingsPage('teams')

export function TeamsRoute() {
  const { workspace } = useWorkspace()
  const workspaceId = workspace.id
  const teams = useQuery(trpc.teams.list.queryOptions({ workspaceId })).data
  const members = useQuery(trpc.workspaces.members.queryOptions({ workspaceId })).data ?? []
  const collections = useQuery(trpc.collections.list.queryOptions({ workspaceId })).data ?? []

  return (
    <TeamsPage
      teams={teams}
      members={members}
      collections={collections}
      workspaceName={workspace.name}
      canManage={canManageWorkspace(workspace.role)}
      onCreate={(name) => attempt(() => createTeam(workspaceId, name))}
      onRename={(team, name) => attempt(() => renameTeam(workspaceId, team.id, name))}
      onDelete={(team) => attempt(() => deleteTeam(workspaceId, team.id))}
      onAddMember={(team, member) => attempt(() => addTeamMember(workspaceId, team.id, member.userId))}
      onRemoveMember={(team, member) => attempt(() => removeTeamMember(workspaceId, team.id, member.userId))}
      onRestrict={(collection, teamIds) => attempt(() => restrictCollection(workspaceId, collection.id, teamIds))}
    />
  )
}

type Dialog =
  | { kind: 'new' }
  | { kind: 'rename'; team: Team }
  | { kind: 'access'; collection: Collection }

function visibilityOf(collection: Collection, teamNames: string[], workspaceName: string): Visibility {
  if (collection.teamIds.length === 0) return { kind: 'everyone', workspaceName }
  return { kind: 'teams', teamCount: collection.teamIds.length, teamNames }
}

export function TeamsPage({
  teams,
  members,
  collections,
  workspaceName,
  canManage,
  onCreate,
  onRename,
  onDelete,
  onAddMember,
  onRemoveMember,
  onRestrict,
}: {
  teams: Team[] | undefined
  members: WorkspaceMember[]
  collections: Collection[]
  workspaceName: string
  canManage: boolean
  onCreate: (name: string) => Promise<SubmitResult>
  onRename: (team: Team, name: string) => Promise<SubmitResult>
  onDelete: (team: Team) => Promise<SubmitResult>
  onAddMember: (team: Team, member: WorkspaceMember) => Promise<SubmitResult>
  onRemoveMember: (team: Team, member: WorkspaceMember) => Promise<SubmitResult>
  onRestrict: (collection: Collection, teamIds: string[]) => Promise<SubmitResult>
}) {
  const [dialog, setDialog] = useState<Dialog>()
  const deleting = useConfirm<{ team: Team; order: string[] }>()
  const cards = useRef<HTMLDivElement>(null)
  const close = () => setDialog(undefined)
  const teamNameById = new Map((teams ?? []).map((team) => [team.id, team.name]))
  const teamNames = (collection: Collection) => collection.teamIds.flatMap((id) => teamNameById.get(id) ?? [])
  const keptTo = new Map<string, Collection[]>()
  for (const collection of collections) {
    for (const teamId of collection.teamIds) keptTo.set(teamId, [...(keptTo.get(teamId) ?? []), collection])
  }

  const report = async (change: Promise<SubmitResult>, done: string, failed: string) => {
    const { error } = await change
    if (error) toast.error(failed, { description: error })
    else toast(done)
  }

  return (
    <>
      <SettingsHeading
        title={PAGE.label}
        description={PAGE.description}
        actions={
          canManage && (
            <Button onClick={() => setDialog({ kind: 'new' })}>
              <PlusIcon aria-hidden />
              New team
            </Button>
          )
        }
      />
      <SettingsStack>
        <section aria-labelledby="teams-title" className="flex flex-col gap-3">
          <h2 id="teams-title" className="sr-only">
            Teams
          </h2>
          {teams?.length === 0 ? (
            <EmptyState
              icon={UsersIcon}
              title="No teams yet"
              description={
                canManage
                  ? 'Make a team for each group that works together, then keep collections to the teams that need them.'
                  : 'Admins can group people into teams and keep collections to them.'
              }
              action={
                canManage && (
                  <Button variant="outline" onClick={() => setDialog({ kind: 'new' })}>
                    <PlusIcon aria-hidden />
                    New team
                  </Button>
                )
              }
              className="rounded-xl border border-dashed"
            />
          ) : (
            <div ref={cards} className="grid gap-3 md:grid-cols-2">
              {teams?.map((team) => (
                <TeamCard
                  key={team.id}
                  team={team}
                  members={members}
                  keptTo={keptTo.get(team.id) ?? []}
                  canManage={canManage}
                  onRename={() => setDialog({ kind: 'rename', team })}
                  onDelete={() => deleting.show({ team, order: rowKeys(cards.current) })}
                  onAddMember={(member) =>
                    void report(onAddMember(team, member), `Added ${member.name} to ${team.name}`, `${member.name} was not added`)
                  }
                  onRemoveMember={(member) =>
                    void report(onRemoveMember(team, member), `Took ${member.name} out of ${team.name}`, `${member.name} is still in ${team.name}`)
                  }
                />
              ))}
            </div>
          )}
        </section>
        <SettingsCard
          title="Collection access"
          description="A collection kept to no team is open to everyone in the workspace. Admins see every collection."
        >
          {collections.length === 0 && <p className="px-5 py-4 text-sm text-muted-foreground">There are no collections yet.</p>}
          {collections.map((collection) => {
            const names = teamNames(collection)
            const visibility = visibilityOf(collection, names, workspaceName)
            return (
              <div key={collection.id} className="flex items-center gap-3 px-5 py-3">
                <FolderIcon aria-hidden className="size-4 shrink-0 text-muted-foreground" />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium text-foreground">{collection.name}</p>
                  {names.length > 0 ? (
                    <p className="truncate text-xs text-muted-foreground">{names.join(', ')}</p>
                  ) : (
                    <p className="text-xs text-muted-foreground sm:hidden">Everyone</p>
                  )}
                </div>
                <span className="max-sm:hidden">
                  <VisibilityChip visibility={visibility} />
                </span>
                {canManage && (
                  <Button
                    variant="ghost"
                    size="sm"
                    aria-label={`Change who can see ${collection.name}`}
                    disabled={!teams}
                    onClick={() => setDialog({ kind: 'access', collection })}
                  >
                    Change
                  </Button>
                )}
              </div>
            )
          })}
        </SettingsCard>
      </SettingsStack>
      {dialog?.kind === 'access' && teams && (
        <AccessDialog
          collection={dialog.collection}
          teams={teams}
          onClose={close}
          onSave={async (teamIds) => {
            const result = await onRestrict(dialog.collection, teamIds)
            if (!result.error) toast(teamIds.length === 0 ? `Everyone can see “${dialog.collection.name}”` : `“${dialog.collection.name}” is kept to ${countLabel(teamIds.length, 'team', 'teams')}`)
            return result
          }}
        />
      )}
      {deleting.target &&
        (() => {
          const { team, order } = deleting.target
          const guarded = keptTo.get(team.id) ?? []
          return guarded.length > 0 ? (
            <ConfirmDialog
              open={deleting.open}
              title={`“${team.name}” still guards ${countLabel(guarded.length, 'collection', 'collections')}`}
              description={`Without the team, ${guarded.map(({ name }) => `“${name}”`).join(', ')} would open to everyone in the workspace, so a team in use can’t be deleted. Give ${guarded.length === 1 ? 'it' : 'them'} to another team, or open ${guarded.length === 1 ? 'it' : 'them'} to everyone, under Collection access first.`}
              cancel="Close"
              onClose={deleting.hide}
            />
          ) : (
            <ConfirmDialog
              open={deleting.open}
              title={`Delete “${team.name}”?`}
              description={
                team.memberIds.length === 0
                  ? 'Nobody is in it, so only the team goes.'
                  : `Its ${countLabel(team.memberIds.length, 'person stays', 'people stay')} in the workspace; only the team goes.`
              }
              action="Delete team"
              busyAction="Deleting…"
              cancel="Keep it"
              onClose={deleting.hide}
              onConfirm={async () => {
                const result = await onDelete(team)
                if (!result.error) {
                  toast(`Deleted the team “${team.name}”`)
                  focusAfterRow(cards.current, order, team.id)
                }
                return result
              }}
            />
          )
        })()}
      {(dialog?.kind === 'new' || dialog?.kind === 'rename') && (
        <NameDialog
          title={dialog.kind === 'new' ? 'New team' : 'Rename team'}
          submitLabel={dialog.kind === 'new' ? 'Create team' : 'Save'}
          label="Team name"
          initial={dialog.kind === 'rename' ? dialog.team.name : ''}
          maxLength={TEAM_NAME_MAX_LENGTH}
          onClose={close}
          onSubmit={async (name) => {
            const result = dialog.kind === 'new' ? await onCreate(name) : await onRename(dialog.team, name)
            if (!result.error) toast(dialog.kind === 'new' ? `Created the team “${name}”` : `Renamed the team to “${name}”`)
            return result
          }}
        />
      )}
    </>
  )
}
