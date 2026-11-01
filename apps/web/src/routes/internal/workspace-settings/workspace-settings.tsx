import { useQuery } from '@tanstack/react-query'
import { useRouter } from '@tanstack/react-router'
import { useState } from 'react'
import { toast } from 'sonner'
import { PhotoButtons } from '@/components/settings/photo-buttons'
import { SettingsCard, SettingsHeading, SettingsNote, SettingsRow, SettingsStack } from '@/components/settings/settings-section'
import { Avatar } from '@/components/ui/avatar'
import { Switch } from '@/components/ui/switch'
import { WorkspaceDangerZone } from '@/components/workspaces/workspace-danger-zone'
import { HOME_PATH } from '@/constants/routes'
import { attempt } from '@/helpers/results'
import { canManageWorkspace } from '@/helpers/roles'
import { settingsPage } from '@/helpers/settings-pages'
import { useWorkspace } from '@/hooks/use-workspace'
import { avatarImage, removeWorkspaceAvatar, uploadWorkspaceAvatar } from '@/services/avatars/avatars'
import { deleteWorkspace, leaveWorkspace, updateWorkspaceSettings } from '@/services/workspaces/workspaces'
import { trpc } from '@/trpc'
import type { ApiKeyItem, WorkspaceMember } from '@/types/api'
import type { SubmitResult } from '@/types/forms'

const PAGE = settingsPage('general')

export function WorkspaceSettingsRoute() {
  const router = useRouter()
  const { principal, workspace } = useWorkspace()
  const [saving, setSaving] = useState(false)
  const canManage = canManageWorkspace(workspace.role)
  const membersQuery = useQuery(trpc.workspaces.members.queryOptions({ workspaceId: workspace.id }))
  const apiKeysQuery = useQuery({ ...trpc.apiKeys.list.queryOptions({ workspaceId: workspace.id }), enabled: canManage })

  const refreshing = async (result: SubmitResult) => {
    if (!result.error) await router.invalidate()
    return result
  }

  const departing = async (run: () => Promise<void>, message: string) => {
    const result = await attempt(run)
    if (!result.error) {
      toast(message)
      await router.navigate({ href: HOME_PATH, replace: true })
    }
    return result
  }

  return (
    <WorkspaceSettingsPage
      workspaceId={workspace.id}
      workspaceName={workspace.name}
      avatarId={workspace.avatarId}
      address={`${window.location.host}/${workspace.slug}`}
      guestEditLinks={workspace.guestEditLinks}
      canManage={canManage}
      currentUserId={principal.userId}
      members={membersQuery.data ?? (membersQuery.isError ? 'failed' : 'loading')}
      apiKeys={canManage ? (apiKeysQuery.data ?? (apiKeysQuery.isError ? 'failed' : 'loading')) : []}
      saving={saving}
      onChange={async (guestEditLinks) => {
        setSaving(true)
        const { error } = await attempt(() => updateWorkspaceSettings(workspace.id, { guestEditLinks }))
        await router.invalidate()
        setSaving(false)
        if (error) toast.error('The setting was not saved', { description: error })
        else toast(guestEditLinks ? 'Guests can now edit through edit links' : 'Every share link now opens read-only')
      }}
      onUploadPhoto={async (file) => refreshing(await uploadWorkspaceAvatar(workspace.id, file))}
      onRemovePhoto={async () => refreshing(await removeWorkspaceAvatar(workspace.id))}
      onLeave={(departure) => departing(() => leaveWorkspace(workspace.id, departure), `You left ${workspace.name}`)}
      onDelete={() => departing(() => deleteWorkspace(workspace.id), `Deleted ${workspace.name}`)}
    />
  )
}

export function WorkspaceSettingsPage({
  workspaceId,
  workspaceName,
  avatarId,
  address,
  guestEditLinks,
  canManage,
  currentUserId,
  members,
  apiKeys,
  saving = false,
  onChange,
  onUploadPhoto,
  onRemovePhoto,
  onLeave,
  onDelete,
}: {
  workspaceId: string
  workspaceName: string
  avatarId: string | null
  address: string
  guestEditLinks: boolean
  canManage: boolean
  currentUserId: string
  members: WorkspaceMember[] | 'loading' | 'failed'
  apiKeys: ApiKeyItem[] | 'loading' | 'failed'
  saving?: boolean
  onChange: (guestEditLinks: boolean) => void
  onUploadPhoto: (file: File) => Promise<SubmitResult>
  onRemovePhoto: () => Promise<SubmitResult>
  onLeave: (departure: { transferTo?: string; revokeKeyIds: string[] }) => Promise<SubmitResult>
  onDelete: () => Promise<SubmitResult>
}) {
  const [photoError, setPhotoError] = useState<string>()
  const photo = avatarImage(avatarId)

  return (
    <>
      <SettingsHeading title={PAGE.label} description={PAGE.description} />
      <SettingsStack>
        <div>
          <SettingsCard title="Workspace">
            <SettingsRow label="Name" description="Shown in the sidebar, in invitations and at the top of every page.">
              <span className="flex min-w-0 items-center gap-2 font-medium text-foreground">
                <Avatar name={workspaceName} seed={workspaceId} image={photo} size="sm" className="rounded-md" />
                <span className="truncate">{workspaceName}</span>
              </span>
            </SettingsRow>
            <SettingsRow
              label="Photo"
              description={
                canManage
                  ? 'Shown beside the name to everyone in the workspace. Without one, the first letter of the name stands in.'
                  : 'Shown beside the name to everyone in the workspace. Only admins can change it.'
              }
            >
              <Avatar name={workspaceName} seed={workspaceId} image={photo} size="lg" className="rounded-lg" />
              {canManage && (
                <PhotoButtons hasPhoto={photo !== undefined} onUpload={onUploadPhoto} onRemove={onRemovePhoto} onResult={setPhotoError} />
              )}
            </SettingsRow>
            {photoError && (
              <p role="alert" className="border-t px-5 py-3 text-sm text-destructive">
                {photoError}
              </p>
            )}
            <SettingsRow label="Address" description="Where the workspace lives. Links to its scenes start with it.">
              <span className="truncate font-mono text-xs text-muted-foreground">{address}</span>
            </SettingsRow>
          </SettingsCard>
          <SettingsNote>
            The name can’t be changed yet: the address is made from it, and renaming would break links people have saved.
          </SettingsNote>
        </div>
        <div>
          <SettingsCard title="Sharing" description="How scenes reach people who have no account.">
            <SettingsRow
              label="Guests may edit through links"
              labelId="guest-editing-label"
              descriptionId="guest-editing-details"
              description="Anyone who can edit a scene may share it with an edit link. Turned off, every link opens read-only and only members can change scenes."
            >
              <Switch
                aria-labelledby="guest-editing-label"
                aria-describedby="guest-editing-details"
                checked={guestEditLinks}
                disabled={!canManage || saving}
                onChange={(event) => onChange(event.target.checked)}
              />
            </SettingsRow>
          </SettingsCard>
          {!canManage && <SettingsNote>Only admins can change how scenes are shared.</SettingsNote>}
        </div>
        <WorkspaceDangerZone
          workspaceName={workspaceName}
          canManage={canManage}
          currentUserId={currentUserId}
          members={members}
          apiKeys={apiKeys}
          onLeave={onLeave}
          onDelete={onDelete}
        />
      </SettingsStack>
    </>
  )
}
