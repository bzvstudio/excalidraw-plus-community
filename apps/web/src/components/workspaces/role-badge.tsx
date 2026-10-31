import type { WorkspaceRole } from '@repo/api'
import { Badge } from '@/components/ui/badge'
import { ROLE_LABELS } from '@/constants/roles'

const VARIANTS = {
  admin: 'brand',
  member: 'secondary',
  viewer: 'outline',
} as const satisfies Record<WorkspaceRole, string>

export function RoleBadge({ role }: { role: WorkspaceRole }) {
  return <Badge variant={VARIANTS[role]}>{ROLE_LABELS[role]}</Badge>
}
