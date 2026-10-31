import { queryClient, trpc, trpcClient } from '@/trpc'

export async function loadCollection(workspaceId: string, collectionId: string) {
  const query = trpc.collections.list.queryOptions({ workspaceId })
  const cached = (await queryClient.ensureQueryData(query)).find((collection) => collection.id === collectionId)
  return cached ?? (await queryClient.fetchQuery(query)).find((collection) => collection.id === collectionId)
}

function refreshCollections(workspaceId: string) {
  return queryClient.invalidateQueries({ queryKey: trpc.collections.list.queryKey({ workspaceId }) })
}

export async function createCollection(workspaceId: string, name: string) {
  const collection = await trpcClient.collections.create.mutate({ workspaceId, name })
  await refreshCollections(workspaceId)
  return collection
}

export async function renameCollection(workspaceId: string, collectionId: string, name: string) {
  await trpcClient.collections.rename.mutate({ workspaceId, collectionId, name })
  await refreshCollections(workspaceId)
}

export async function deleteCollection(workspaceId: string, collectionId: string, leave?: () => Promise<unknown>) {
  await trpcClient.collections.delete.mutate({ workspaceId, collectionId })
  try {
    await leave?.()
  } finally {
    await refreshCollections(workspaceId)
  }
}

export async function restrictCollection(workspaceId: string, collectionId: string, teamIds: string[]) {
  await trpcClient.collections.restrict.mutate({ workspaceId, collectionId, teamIds })
  await Promise.all([
    refreshCollections(workspaceId),
    queryClient.invalidateQueries({ queryKey: trpc.scenes.list.queryKey({ workspaceId }) }),
  ])
}
