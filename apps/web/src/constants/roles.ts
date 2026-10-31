import type { WorkspaceRole } from '@repo/api'
import { INVITE_MAX_USES, INVITE_VALIDITY_DAYS } from '@repo/api/workspaces.const'

export type InviteValidityDays = (typeof INVITE_VALIDITY_DAYS)[number]

export const ROLE_LABELS: Record<WorkspaceRole, string> = {
  admin: 'Admin',
  member: 'Member',
  viewer: 'Viewer',
}

export const INVITE_MAX_USES_OPTIONS = [
  ...INVITE_MAX_USES.map((uses) => ({ value: String(uses), label: uses === 1 ? '1 use' : `${uses} uses` })),
  { value: 'none', label: 'No limit' },
]

export function maxUsesSentence(maxUses: string) {
  if (maxUses === 'none') return 'Anyone with the link can join until it expires.'
  if (maxUses === '1') return 'One person can join with it, and then it stops working.'
  return `Up to ${maxUses} people can join with it, and then it stops working.`
}

export const ROLE_DESCRIPTIONS: Record<WorkspaceRole, string> = {
  admin: 'Admins manage members, teams, sharing, AI and API keys, and see every scene.',
  member: 'Members create, edit and organise scenes in the collections open to them.',
  viewer: 'Viewers open and comment on scenes in the collections open to them, but change nothing.',
}
