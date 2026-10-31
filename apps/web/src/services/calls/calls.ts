import type { JoinRequest } from '@repo/api'
import { trpcClient } from '@/trpc'

export type CallTicket = { url: string; token: string }

export function requestCallTicket(request: JoinRequest): Promise<CallTicket> {
  return trpcClient.calls.join.mutate(request)
}
