import type { SettingsPageId } from '@/constants/settings'

export const HOME_PATH = '/'

export const ROUTE_GUARD_FRESH_MS = 30_000

export const CREATE_WORKSPACE_PATH = '/new'

export const ACCOUNT_PATH = '/account'

export const LEGACY_SETTINGS_PAGES: ReadonlyMap<string, SettingsPageId> = new Map([
  ['', 'general'],
  ['members', 'members'],
  ['teams', 'teams'],
  ['ai', 'ai'],
  ['api-keys', 'api-keys'],
  ['logs', 'audit-log'],
  ['audit', 'audit-log'],
  ['user-preferences', 'account'],
  ['user-my-workspaces', 'account-workspaces'],
])

export const LEGACY_NEW_API_KEY_PAGE = 'api-keys/create'
