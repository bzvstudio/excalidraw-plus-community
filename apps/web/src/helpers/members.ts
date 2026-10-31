import { WORKSPACE_ROLES } from '@repo/api/authorization.const'
import type { WorkspaceMember } from '@/types/api'

export function sortMembers(members: WorkspaceMember[]): WorkspaceMember[] {
  return [...members].sort(
    (a, b) => WORKSPACE_ROLES.indexOf(a.role) - WORKSPACE_ROLES.indexOf(b.role) || a.name.localeCompare(b.name),
  )
}
