import type { WorkspaceRole } from '@repo/api'
import { ROLE_CAPABILITIES } from '@repo/api/authorization.const'

export function canManageWorkspace(role: WorkspaceRole): boolean {
  return ROLE_CAPABILITIES[role].includes('workspace.manage')
}

export function canEditScenes(role: WorkspaceRole): boolean {
  return ROLE_CAPABILITIES[role].includes('scene.edit')
}

export function canManageCollections(role: WorkspaceRole): boolean {
  return ROLE_CAPABILITIES[role].includes('collection.manage')
}
