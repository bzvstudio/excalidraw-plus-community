import { linkOptions, type LinkProps } from '@tanstack/react-router'
import { ACCOUNT_PATH } from '@/constants/routes'
import { NEW_API_KEY_LABEL, SETTINGS_PAGES, type SettingsGroup, type SettingsPage, type SettingsPageId } from '@/constants/settings'
import { settingsLink, workspaceLink } from '@/helpers/places'

export type SettingsPlace = { page: SettingsPage; newKey: boolean }

const WORKSPACE_PAGES: Record<string, SettingsPageId> = {
  '': 'general',
  members: 'members',
  teams: 'teams',
  ai: 'ai',
  'api-keys': 'api-keys',
  'audit-log': 'audit-log',
}

export function isSettingsPath(pathname: string): boolean {
  return settingsPlaceAt(pathname) !== undefined
}

export function settingsPage(id: SettingsPageId): SettingsPage {
  return SETTINGS_PAGES.find((page) => page.id === id)!
}

export function settingsPagesFor(isAdmin: boolean, group?: SettingsGroup): SettingsPage[] {
  return SETTINGS_PAGES.filter((page) => (isAdmin || !page.adminOnly) && (!group || page.group === group))
}

export function settingsPlaceAt(pathname: string): SettingsPlace | undefined {
  const path = pathname.replace(/\/+$/, '')
  const account = /^\/account(\/workspaces)?$/.exec(path)
  if (account) return { page: settingsPage(account[1] ? 'account-workspaces' : 'account'), newKey: false }
  const workspace = /^\/[^/]+\/settings(?:\/([^/]+))?(\/new)?$/.exec(path)
  if (!workspace) return undefined
  const id = WORKSPACE_PAGES[workspace[1] ?? '']
  if (!id) return undefined
  if (workspace[2] && id !== 'api-keys') return undefined
  return { page: settingsPage(id), newKey: workspace[2] !== undefined }
}

export function settingsCrumbs(
  { page, newKey }: SettingsPlace,
  workspace: { name: string; slug: string },
): { label: string; link?: LinkProps }[] {
  if (page.group === 'account') return [{ label: 'Account', link: linkOptions({ to: ACCOUNT_PATH }) }, { label: page.label }]
  return [
    { label: workspace.name, link: workspaceLink(workspace.slug) },
    { label: 'Settings', link: settingsLink(workspace.slug) },
    { label: page.label, link: settingsLink(workspace.slug, page.id) },
    ...(newKey ? [{ label: NEW_API_KEY_LABEL }] : []),
  ]
}

export function fieldProps(id: string, error?: string) {
  return { id, 'aria-invalid': error ? true : undefined, 'aria-describedby': `${id}-note` }
}
