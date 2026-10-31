import { AUDIT_PAGE_SIZE, type AuditActionName } from '@/constants/audit'
import { trpc } from '@/trpc'

export function auditLogQuery(workspaceId: string, filter: { action?: AuditActionName; actorId?: string } = {}) {
  return trpc.audit.list.infiniteQueryOptions(
    {
      workspaceId,
      limit: AUDIT_PAGE_SIZE,
      ...(filter.action && { action: filter.action }),
      ...(filter.actorId && { actorId: filter.actorId }),
    },
    { getNextPageParam: (page) => page.nextCursor ?? undefined, staleTime: 0 },
  )
}
