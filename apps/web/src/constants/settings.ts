export type SettingsPageId = 'general' | 'members' | 'teams' | 'ai' | 'api-keys' | 'audit-log' | 'account' | 'account-workspaces'

export type SettingsGroup = 'workspace' | 'account'

export const SETTINGS_ROUTES = {
  general: '/$slug/settings',
  members: '/$slug/settings/members',
  teams: '/$slug/settings/teams',
  ai: '/$slug/settings/ai',
  'api-keys': '/$slug/settings/api-keys',
  'audit-log': '/$slug/settings/audit-log',
  account: '/account',
  'account-workspaces': '/account/workspaces',
} as const satisfies Record<SettingsPageId, string>

export type SettingsPage = {
  id: SettingsPageId
  label: string
  description: string
  group: SettingsGroup
  adminOnly: boolean
}

export const SETTINGS_GROUP_LABELS: Record<SettingsGroup, string> = {
  workspace: 'Workspace',
  account: 'Account',
}

export const SETTINGS_PAGES: SettingsPage[] = [
  {
    id: 'general',
    label: 'General',
    description: 'The workspace’s name and how its scenes may be shared.',
    group: 'workspace',
    adminOnly: false,
  },
  {
    id: 'members',
    label: 'Members',
    description: 'Who is in the workspace, what each person may do, and who is on their way in.',
    group: 'workspace',
    adminOnly: false,
  },
  {
    id: 'teams',
    label: 'Teams',
    description: 'Group people into teams, and keep collections to the teams that need them.',
    group: 'workspace',
    adminOnly: false,
  },
  {
    id: 'ai',
    label: 'AI',
    description: 'Where the workspace’s AI requests go, and the model that answers them.',
    group: 'workspace',
    adminOnly: false,
  },
  {
    id: 'api-keys',
    label: 'API & MCP',
    description: 'Keys for scripts, integrations and AI agents, and how to connect an agent over MCP.',
    group: 'workspace',
    adminOnly: true,
  },
  {
    id: 'audit-log',
    label: 'Audit log',
    description: 'A record of who changed access to the workspace, and when.',
    group: 'workspace',
    adminOnly: true,
  },
  {
    id: 'account',
    label: 'Profile & preferences',
    description: 'Your details, and how the app looks for you.',
    group: 'account',
    adminOnly: false,
  },
  {
    id: 'account-workspaces',
    label: 'Your workspaces',
    description: 'Every workspace you belong to, and your role in each.',
    group: 'account',
    adminOnly: false,
  },
]

export const NEW_API_KEY_LABEL = 'New key'
