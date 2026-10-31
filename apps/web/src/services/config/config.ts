import { useSuspenseQuery } from '@tanstack/react-query'
import type { RuntimeConfig } from '@repo/api'
import { queryClient, trpc } from '@/trpc'

const runtimeConfigQuery = trpc.config.get.queryOptions(undefined, { staleTime: Infinity })

export function loadRuntimeConfig(): Promise<RuntimeConfig> {
  return queryClient.ensureQueryData(runtimeConfigQuery)
}

export function useRuntimeConfig(): RuntimeConfig {
  return useSuspenseQuery(runtimeConfigQuery).data
}
