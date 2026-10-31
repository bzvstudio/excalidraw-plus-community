import type { ShareRole } from '@repo/api'
import { SHARE_LINK_VALIDITY_DAYS, SHARE_PATH, UNKNOWN_SHARE_LINK } from '@repo/api/sharing.const'
import { SHARED_PATH } from '@repo/api/system.const'
import { isUuid } from '@/helpers/address'
import { embedSnippet } from '@/services/embeds/embeds'
import { queryClient, trpc, trpcClient } from '@/trpc'

export type { ShareRole }

export type ShareValidity = (typeof SHARE_LINK_VALIDITY_DAYS)[number] | null

function refreshLinks(workspaceId: string, sceneId: string) {
  return queryClient.invalidateQueries({ queryKey: trpc.shares.list.queryKey({ workspaceId, sceneId }) })
}

function shareUrl(token: string): string {
  return `${window.location.origin}${SHARE_PATH}#${token}`
}

export type CreatedLink = { url: string; embed?: string }

export async function createShareLink(
  workspaceId: string,
  sceneId: string,
  role: ShareRole,
  validForDays: ShareValidity,
): Promise<CreatedLink> {
  const { token } = await trpcClient.shares.create.mutate({ workspaceId, sceneId, role, validForDays })
  await refreshLinks(workspaceId, sceneId)
  return role === 'view' ? { url: shareUrl(token), embed: embedSnippet(token) } : { url: shareUrl(token) }
}

export async function revokeShareLink(workspaceId: string, sceneId: string, linkId: string) {
  await trpcClient.shares.revoke.mutate({ workspaceId, sceneId, linkId })
  await refreshLinks(workspaceId, sceneId)
}

export async function openShareLink(token: string, name: string | undefined) {
  const response = await fetch(`${SHARED_PATH}/open`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ token, name }),
  })
  const body = (await response.json()) as {
    linkId?: string
    membership?: { workspaceSlug: string; sceneId: string } | null
    error?: string
  }
  if (!response.ok || !body.linkId) throw new Error(body.error ?? 'This link does not work')
  return { linkId: body.linkId, membership: body.membership ?? undefined }
}

export async function loadSharedScene(linkId: string) {
  if (!isUuid(linkId)) throw new Error(UNKNOWN_SHARE_LINK)
  return trpcClient.shared.get.query({ linkId })
}
