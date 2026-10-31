import type { AUDIT_CATALOGUE } from '@repo/api/audit.const'

export type AuditActionName = keyof typeof AUDIT_CATALOGUE

export const AUDIT_ACTION_LABELS: Record<AuditActionName, string> = {
  'member.invited': 'created an invite link',
  'invite.revoked': 'withdrew an invite link',
  'member.joined': 'joined the workspace',
  'member.role_changed': 'changed the role of',
  'member.removed': 'removed',
  'member.readmitted': 'let back in',
  'team.member_added': 'added a team member,',
  'team.member_removed': 'took a member off a team,',
  'share_link.created': 'made a share link to',
  'share_link.revoked': 'turned off a share link to',
  'api_key.created': 'created the API key',
  'api_key.revoked': 'revoked the API key',
  'ai_key.set': 'connected an AI key',
  'ai_key.removed': 'removed the AI key',
  'workspace.settings_changed': 'changed the workspace settings',
  'workspace.photo_changed': 'changed the workspace photo',
  'workspace.photo_removed': 'removed the workspace photo',
  'collection.access_changed': 'changed who can see',
  'scene.moved': 'moved the scene',
  'scene.deleted': 'deleted the scene',
}

export const AUDIT_ACTION_OPTIONS = [
  { value: 'all', label: 'All actions' },
  ...Object.entries(AUDIT_ACTION_LABELS).map(([value, label]) => ({
    value,
    label: label[0]!.toUpperCase() + label.slice(1).replace(/,$/, ''),
  })),
]

export const AUDIT_ACTOR_FALLBACK = { user: 'A former member', key: 'A deleted API key' } as const

export type AuditOperation = 'create' | 'update' | 'delete'

export const AUDIT_OPERATIONS: Record<AuditActionName, AuditOperation> = {
  'member.invited': 'create',
  'invite.revoked': 'delete',
  'member.joined': 'create',
  'member.role_changed': 'update',
  'member.removed': 'delete',
  'member.readmitted': 'update',
  'team.member_added': 'create',
  'team.member_removed': 'delete',
  'share_link.created': 'create',
  'share_link.revoked': 'delete',
  'api_key.created': 'create',
  'api_key.revoked': 'delete',
  'ai_key.set': 'create',
  'ai_key.removed': 'delete',
  'workspace.settings_changed': 'update',
  'workspace.photo_changed': 'update',
  'workspace.photo_removed': 'delete',
  'collection.access_changed': 'update',
  'scene.moved': 'update',
  'scene.deleted': 'delete',
}

export const AUDIT_SUBJECTS: Record<string, string> = {
  member: 'Member',
  invite: 'Invite link',
  team: 'Team',
  share_link: 'Share link',
  api_key: 'API key',
  ai_key: 'AI key',
  workspace: 'Workspace',
  collection: 'Collection',
  scene: 'Scene',
}

export const AUDIT_PAGE_SIZE = 25
