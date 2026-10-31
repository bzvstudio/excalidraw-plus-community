import type { InvitableRole, WorkspaceRole } from '@repo/api'
import { useQuery } from '@tanstack/react-query'
import { Link2Icon, MailIcon } from 'lucide-react'
import { useRef, useState } from 'react'
import { toast } from 'sonner'
import { ConfirmDialog } from '@/components/settings/confirm-dialog'
import { SettingsHeading } from '@/components/settings/settings-section'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { type InviteMaxUses, InviteLinkDialog, InviteUserDialog } from '@/components/workspaces/invite-dialogs'
import { MemberKeysDialog } from '@/components/workspaces/member-keys-dialog'
import { MembersList } from '@/components/workspaces/members-list'
import { PendingInvites } from '@/components/workspaces/pending-invites'
import { RemovedMembers } from '@/components/workspaces/removed-members'
import { RoleDialog } from '@/components/workspaces/role-dialog'
import { ROLE_LABELS } from '@/constants/roles'
import { attempt } from '@/helpers/results'
import { canManageWorkspace } from '@/helpers/roles'
import { settingsPage } from '@/helpers/settings-pages'
import { useConfirm } from '@/hooks/use-confirm'
import { focusAfterRow, rowKeys } from '@/hooks/use-focus-after-removal'
import { useWorkspace } from '@/hooks/use-workspace'
import { useRuntimeConfig } from '@/services/config/config'
import {
  changeMemberRole,
  requestInviteLink,
  emailInvite,
  readmitMember,
  removeMember,
  revokeInvite,
} from '@/services/workspaces/workspaces'
import { trpc } from '@/trpc'
import type { ApiKeyItem, RemovedMember, WorkspaceInvite, WorkspaceMember } from '@/types/api'
import type { SubmitResult } from '@/types/forms'

const PAGE = settingsPage('members')

export function MembersRoute() {
  const { principal, workspace } = useWorkspace()
  const workspaceId = workspace.id
  const canManage = canManageWorkspace(workspace.role)
  const members = useQuery(trpc.workspaces.members.queryOptions({ workspaceId })).data ?? []
  const invites = useQuery({ ...trpc.workspaces.invites.queryOptions({ workspaceId }), enabled: canManage }).data ?? []
  const removed = useQuery({ ...trpc.workspaces.removed.queryOptions({ workspaceId }), enabled: canManage }).data ?? []
  const apiKeysQuery = useQuery({ ...trpc.apiKeys.list.queryOptions({ workspaceId }), enabled: canManage })
  const { emailEnabled } = useRuntimeConfig()

  return (
    <MembersPage
      members={members}
      invites={invites}
      removed={removed}
      apiKeys={apiKeysQuery.data ?? (apiKeysQuery.isError ? 'failed' : 'loading')}
      workspaceName={workspace.name}
      currentUserId={principal.userId}
      canManage={canManage}
      onChangeRole={(userId, role, revokeKeyIds) => attempt(() => changeMemberRole(workspaceId, userId, role, revokeKeyIds))}
      onRemove={(member, revokeKeyIds) => attempt(() => removeMember(workspaceId, member.userId, revokeKeyIds))}
      onCreateInvite={(role, maxUses) => requestInviteLink(workspaceId, role, maxUses)}
      onRevokeInvite={(invite) => attempt(() => revokeInvite(workspaceId, invite.id))}
      onReadmit={(person) => attempt(() => readmitMember(workspaceId, person.userId))}
      onEmailInvite={emailEnabled ? (to, role) => attempt(() => emailInvite(workspaceId, to, role)) : undefined}
    />
  )
}

type Dialog =
  | { kind: 'role'; member: WorkspaceMember }
  | { kind: 'keys'; member: WorkspaceMember; role?: WorkspaceRole }
  | { kind: 'invite-link' }
  | { kind: 'invite-email' }

type Tab = 'members' | 'invites' | 'removed'

function TabCount({ count }: { count: number }) {
  return <span className="min-w-4 rounded-full bg-foreground/8 px-1.5 text-xs text-muted-foreground tabular-nums">{count}</span>
}

export function MembersPage({
  members,
  invites,
  removed,
  apiKeys,
  workspaceName,
  currentUserId,
  canManage,
  onChangeRole,
  onRemove,
  onCreateInvite,
  onRevokeInvite,
  onReadmit,
  onEmailInvite,
}: {
  members: WorkspaceMember[]
  invites: WorkspaceInvite[]
  removed: RemovedMember[]
  apiKeys: ApiKeyItem[] | 'loading' | 'failed'
  workspaceName: string
  currentUserId: string
  canManage: boolean
  onChangeRole: (userId: string, role: WorkspaceRole, revokeKeyIds: string[]) => Promise<SubmitResult>
  onRemove: (member: WorkspaceMember, revokeKeyIds: string[]) => Promise<SubmitResult>
  onCreateInvite: (role: InvitableRole, maxUses: InviteMaxUses) => Promise<{ link?: string; error?: string }>
  onRevokeInvite: (invite: WorkspaceInvite) => Promise<SubmitResult>
  onReadmit: (person: RemovedMember) => Promise<SubmitResult>
  onEmailInvite?: (to: string, role: InvitableRole) => Promise<SubmitResult>
}) {
  const [dialog, setDialog] = useState<Dialog>()
  const withdrawing = useConfirm<{ invite: WorkspaceInvite; order: string[] }>()
  const inviteList = useRef<HTMLDivElement>(null)
  const [tab, setTab] = useState<Tab>('members')
  const close = () => setDialog(undefined)
  const keysOf = (member: WorkspaceMember) =>
    Array.isArray(apiKeys) ? apiKeys.filter((key) => key.createdBy === member.userId && key.status === 'active') : apiKeys

  const changeRole = async (member: WorkspaceMember, role: WorkspaceRole) => {
    if (member.role === 'admin' && role !== 'admin') return setDialog({ kind: 'keys', member, role })
    const { error } = await onChangeRole(member.userId, role, [])
    if (error) toast.error(`${member.name}’s role was not changed`, { description: error })
    else toast(`${member.name} is now ${role === 'admin' ? 'an' : 'a'} ${ROLE_LABELS[role].toLowerCase()}`)
  }

  const readmit = async (person: RemovedMember) => {
    const { error } = await onReadmit(person)
    if (error) toast.error(`${person.name} was not let back in`, { description: error })
    else toast(`${person.name} can join again with an invite`)
  }

  const list = (
    <MembersList
      members={members}
      currentUserId={currentUserId}
      canManage={canManage}
      onChangeRole={(member) => setDialog({ kind: 'role', member })}
      onRemove={(member) => setDialog({ kind: 'keys', member })}
    />
  )

  return (
    <>
      <SettingsHeading
        title={PAGE.label}
        description={PAGE.description}
        actions={
          canManage && (
            <>
              <Button variant={onEmailInvite ? 'outline' : 'default'} onClick={() => setDialog({ kind: 'invite-link' })}>
                <Link2Icon aria-hidden />
                Create invite link
              </Button>
              {onEmailInvite && (
                <Button onClick={() => setDialog({ kind: 'invite-email' })}>
                  <MailIcon aria-hidden />
                  Invite by email
                </Button>
              )}
            </>
          )
        }
      />
      {canManage ? (
        <Tabs value={tab} onValueChange={(value) => setTab(value as Tab)} className="gap-4">
          <TabsList className="max-sm:w-full">
            <TabsTrigger value="members">
              Members <TabCount count={members.length} />
            </TabsTrigger>
            <TabsTrigger value="invites">
              Invites <TabCount count={invites.length} />
            </TabsTrigger>
            <TabsTrigger value="removed">
              Removed <TabCount count={removed.length} />
            </TabsTrigger>
          </TabsList>
          <TabsContent value="members">{list}</TabsContent>
          <TabsContent value="invites">
            <div ref={inviteList}>
              <PendingInvites invites={invites} onRevoke={(invite) => withdrawing.show({ invite, order: rowKeys(inviteList.current) })} />
            </div>
          </TabsContent>
          <TabsContent value="removed">
            <RemovedMembers removed={removed} onReadmit={(person) => void readmit(person)} />
          </TabsContent>
        </Tabs>
      ) : (
        <>
          {list}
          <p className="mt-3 text-xs text-muted-foreground">Only admins can invite people or change roles.</p>
        </>
      )}
      {dialog?.kind === 'role' && (
        <RoleDialog member={dialog.member} onClose={close} onSave={(role) => void changeRole(dialog.member, role)} />
      )}
      {dialog?.kind === 'keys' && (
        <MemberKeysDialog
          key={dialog.member.userId}
          title={
            dialog.role
              ? `Make ${dialog.member.name} ${dialog.role === 'admin' ? 'an' : 'a'} ${ROLE_LABELS[dialog.role].toLowerCase()}?`
              : `Remove ${dialog.member.name} from ${workspaceName}?`
          }
          consequence={
            dialog.role
              ? `${dialog.member.name} will no longer manage members, sharing, AI or keys.`
              : `${dialog.member.name} loses access to everything in ${workspaceName} straight away, and invite links won’t let them back in until you allow it.`
          }
          action={dialog.role ? 'Change role' : 'Remove'}
          keys={keysOf(dialog.member)}
          onClose={close}
          onConfirm={async (revokeKeyIds) => {
            const result = dialog.role
              ? await onChangeRole(dialog.member.userId, dialog.role, revokeKeyIds)
              : await onRemove(dialog.member, revokeKeyIds)
            if (!result.error) {
              toast(
                dialog.role
                  ? `${dialog.member.name} is now a ${ROLE_LABELS[dialog.role].toLowerCase()}`
                  : `Removed ${dialog.member.name} from ${workspaceName}`,
              )
            }
            return result
          }}
        />
      )}
      {withdrawing.target && (
        <ConfirmDialog
          open={withdrawing.open}
          title="Withdraw this invite link?"
          description="Anyone who has the link won’t be able to join with it. People who already joined stay."
          action="Withdraw link"
          busyAction="Withdrawing…"
          cancel="Keep it"
          onClose={withdrawing.hide}
          onConfirm={async () => {
            const { invite, order } = withdrawing.target!
            const result = await onRevokeInvite(invite)
            if (!result.error) {
              toast('Invite link withdrawn')
              focusAfterRow(inviteList.current, order, invite.id)
            }
            return result
          }}
        />
      )}
      {dialog?.kind === 'invite-link' && <InviteLinkDialog onCreate={onCreateInvite} onClose={close} />}
      {dialog?.kind === 'invite-email' && onEmailInvite && <InviteUserDialog onEmail={onEmailInvite} onClose={close} />}
    </>
  )
}
