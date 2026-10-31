import { TRPCClientError } from '@trpc/client'
import { trpcClient } from '@/trpc'
import type { LibraryItemData } from '@/types/api'

export function loadLibrary() {
  return trpcClient.library.get.query()
}

export function saveLibrary(items: LibraryItemData[], basedOn: number) {
  return trpcClient.library.save.mutate({ items, basedOn })
}

export function isLibraryConflict(error: unknown): boolean {
  return error instanceof TRPCClientError && error.data?.code === 'CONFLICT'
}
