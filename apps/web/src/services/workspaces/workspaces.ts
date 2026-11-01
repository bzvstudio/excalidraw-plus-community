import type { InvitableRole, WorkspaceRole, WorkspaceSummary } from '@repo/api'
import { INVITE_DEFAULT_DAYS, INVITE_PATH } from '@repo/api/workspaces.const'
import { TRPCClientError } from '@trpc/client'
import { ROUTE_GUARD_FRESH_MS } from '@/constants/routes'
import { dropCarriedInvite } from '@/services/auth/invite-cookie'
import { messageOf } from '@/helpers/results'
import { queryClient, trpc, trpcClient } from '@/trpc'

const PENDING_INVITE_KEY = 'pending-invite'

export const INVITE_ROUTE = INVITE_PATH

export function loadWorkspaces(): Promise<WorkspaceSummary[]> {
  return queryClient.fetchQuery({ ...trpc.workspaces.list.queryOptions(), staleTime: ROUTE_GUARD_FRESH_MS })
}

export async function loadWorkspace(slug: string): Promise<WorkspaceSummary | undefined> {
  try {
    return await queryClient.fetchQuery({ ...trpc.workspaces.bySlug.queryOptions({ slug }), staleTime: ROUTE_GUARD_FRESH_MS })
  } catch (error) {
    if (error instanceof TRPCClientError && error.data?.code === 'NOT_FOUND') return undefined
    throw error
  }
}

export async function createWorkspace(name: string, handle?: string): Promise<WorkspaceSummary> {
  const workspace = await trpcClient.workspaces.create.mutate({ name, handle })
  await queryClient.invalidateQueries({ queryKey: trpc.workspaces.list.queryKey() })
  return workspace
}

export function previewInvite(token: string) {
  return trpcClient.invites.preview.mutate({ token })
}

export async function acceptInvite(token: string): Promise<WorkspaceSummary> {
  const workspace = await trpcClient.invites.accept.mutate({ token })
  forgetPendingInvite()
  await queryClient.invalidateQueries({ queryKey: trpc.workspaces.list.queryKey() })
  return workspace
}

export function inviteLink(token: string): string {
  return `${window.location.origin}${INVITE_ROUTE}#${token}`
}

type InviteMaxUses = Parameters<typeof trpcClient.workspaces.createInvite.mutate>[0]['maxUses']

export async function createInviteLink(workspaceId: string, role: InvitableRole, maxUses: InviteMaxUses): Promise<string> {
  const { token } = await trpcClient.workspaces.createInvite.mutate({ workspaceId, role, validForDays: INVITE_DEFAULT_DAYS, maxUses })
  await queryClient.invalidateQueries({ queryKey: trpc.workspaces.invites.queryKey({ workspaceId }) })
  return inviteLink(token)
}

export async function requestInviteLink(workspaceId: string, role: InvitableRole, maxUses: InviteMaxUses): Promise<{ link?: string; error?: string }> {
  try {
    return { link: await createInviteLink(workspaceId, role, maxUses) }
  } catch (failure) {
    return { error: messageOf(failure) }
  }
}

export function rememberPendingInvite(token: string): void {
  try {
    sessionStorage.setItem(PENDING_INVITE_KEY, token)
  } catch {
    return
  }
}

export function recallPendingInvite(): string {
  try {
    return sessionStorage.getItem(PENDING_INVITE_KEY) ?? ''
  } catch {
    return ''
  }
}

function forgetPendingInvite(): void {
  dropCarriedInvite()
  try {
    sessionStorage.removeItem(PENDING_INVITE_KEY)
  } catch {
    return
  }
}

export async function updateWorkspaceSettings(workspaceId: string, settings: { guestEditLinks: boolean }) {
  await trpcClient.workspaces.updateSettings.mutate({ workspaceId, ...settings })
  await queryClient.invalidateQueries({ queryKey: trpc.workspaces.bySlug.queryKey() })
}

function refreshPeople(workspaceId: string) {
  return Promise.all(
    [
      trpc.workspaces.members.queryKey({ workspaceId }),
      trpc.workspaces.invites.queryKey({ workspaceId }),
      trpc.workspaces.removed.queryKey({ workspaceId }),
      trpc.apiKeys.list.queryKey({ workspaceId }),
      trpc.workspaces.list.queryKey(),
    ].map((queryKey) => queryClient.invalidateQueries({ queryKey })),
  )
}

export async function changeMemberRole(workspaceId: string, userId: string, role: WorkspaceRole, revokeKeyIds: string[]) {
  await trpcClient.workspaces.changeRole.mutate({ workspaceId, userId, role, revokeKeyIds })
  queryClient.setQueryData(trpc.workspaces.members.queryKey({ workspaceId }), (members) =>
    members?.map((member) => (member.userId === userId ? { ...member, role } : member)),
  )
  await refreshPeople(workspaceId)
}

export async function removeMember(workspaceId: string, userId: string, revokeKeyIds: string[]) {
  await trpcClient.workspaces.removeMember.mutate({ workspaceId, userId, revokeKeyIds })
  queryClient.setQueryData(trpc.workspaces.members.queryKey({ workspaceId }), (members) =>
    members?.filter((member) => member.userId !== userId),
  )
  await refreshPeople(workspaceId)
}

async function forgetWorkspace() {
  queryClient.removeQueries({ queryKey: trpc.workspaces.bySlug.queryKey() })
  await queryClient.invalidateQueries({ queryKey: trpc.workspaces.list.queryKey() })
}

export async function leaveWorkspace(workspaceId: string, departure: { transferTo?: string; revokeKeyIds: string[] }) {
  await trpcClient.workspaces.leave.mutate({ workspaceId, ...departure })
  await forgetWorkspace()
}

export async function deleteWorkspace(workspaceId: string) {
  await trpcClient.workspaces.delete.mutate({ workspaceId })
  await forgetWorkspace()
}

export async function revokeInvite(workspaceId: string, inviteId: string) {
  await trpcClient.workspaces.revokeInvite.mutate({ workspaceId, inviteId })
  queryClient.setQueryData(trpc.workspaces.invites.queryKey({ workspaceId }), (invites) => invites?.filter(({ id }) => id !== inviteId))
  await queryClient.invalidateQueries({ queryKey: trpc.workspaces.invites.queryKey({ workspaceId }) })
}

export async function readmitMember(workspaceId: string, userId: string) {
  await trpcClient.workspaces.readmit.mutate({ workspaceId, userId })
  queryClient.setQueryData(trpc.workspaces.removed.queryKey({ workspaceId }), (removed) =>
    removed?.filter((person) => person.userId !== userId),
  )
  await queryClient.invalidateQueries({ queryKey: trpc.workspaces.removed.queryKey({ workspaceId }) })
}

export async function emailInvite(workspaceId: string, to: string, role: InvitableRole) {
  await trpcClient.workspaces.emailInvite.mutate({ workspaceId, to, role, validForDays: INVITE_DEFAULT_DAYS })
  await queryClient.invalidateQueries({ queryKey: trpc.workspaces.invites.queryKey({ workspaceId }) })
}
