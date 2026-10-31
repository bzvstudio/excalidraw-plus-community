import type { ApiKeyScope } from '@repo/api'
import type { API_KEY_VALIDITY_DAYS } from '@repo/api/api-keys.const'
import { queryClient, trpc, trpcClient } from '@/trpc'

export type NewApiKey = {
  name: string
  scope: ApiKeyScope
  validForDays: (typeof API_KEY_VALIDITY_DAYS)[number] | null
}

function refreshKeys(workspaceId: string) {
  return queryClient.invalidateQueries({ queryKey: trpc.apiKeys.list.queryKey({ workspaceId }) })
}

export async function createApiKey(workspaceId: string, key: NewApiKey): Promise<string> {
  const { secret } = await trpcClient.apiKeys.create.mutate({ workspaceId, ...key })
  await refreshKeys(workspaceId)
  return secret
}

export async function revokeApiKey(workspaceId: string, keyId: string) {
  await trpcClient.apiKeys.revoke.mutate({ workspaceId, keyId })
  await refreshKeys(workspaceId)
}
