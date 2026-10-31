import type { AppRouter } from '@repo/api'
import { QueryClient } from '@tanstack/react-query'
import { createTRPCClient, httpBatchLink } from '@trpc/client'
import { createTRPCContext, createTRPCOptionsProxy } from '@trpc/tanstack-react-query'
import { QUERY_FRESH_MS } from '@/constants/query'

export const { TRPCProvider } = createTRPCContext<AppRouter>()

export const queryClient = new QueryClient({ defaultOptions: { queries: { staleTime: QUERY_FRESH_MS } } })

export const trpcClient = createTRPCClient<AppRouter>({
  links: [httpBatchLink({ url: '/trpc' })],
})

export const trpc = createTRPCOptionsProxy<AppRouter>({ client: trpcClient, queryClient })

export async function preload(...requests: Promise<unknown>[]): Promise<void> {
  await Promise.allSettled(requests)
}
