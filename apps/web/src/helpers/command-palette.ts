import type { WorkspaceRole } from '@repo/api'
import { DRAFTS } from '@repo/api/scenes.const'
import { PALETTE_COLLECTIONS_SHOWN, PALETTE_GROUP_LABELS, type PaletteGroupId } from '@/constants/command-palette'
import { SETTINGS_GROUP_LABELS, type SettingsPageId } from '@/constants/settings'
import { canEditScenes, canManageCollections, canManageWorkspace } from '@/helpers/roles'
import { activityLink, placeLink, sceneLink, settingsLink, workspaceLink } from '@/helpers/places'
import { settingsPagesFor } from '@/helpers/settings-pages'
import type { ThemePreference } from '@/hooks/use-theme'
import type { Collection, SceneListItem } from '@/types/api'

export type PalettePage = 'home' | 'drafts' | 'activity'

export type PaletteDestination = { page: PalettePage } | { settings: SettingsPageId }

export type PaletteActionId = 'new-scene' | 'new-collection' | 'import' | 'invite'

type CommandBase = { key: string; label: string; detail?: string; keywords: string }

export type PaletteGo = CommandBase & { kind: 'go'; destination: PaletteDestination }

export type PaletteRunnable =
  | (CommandBase & { kind: 'action'; action: PaletteActionId })
  | (CommandBase & { kind: 'theme'; theme: ThemePreference })
  | (CommandBase & { kind: 'workspace'; slug: string })

export type PaletteCommand = PaletteGo | PaletteRunnable

export type PaletteItem =
  | { kind: 'scene'; key: string; label: string; scene: SceneListItem }
  | { kind: 'collection'; key: string; label: string; collection: Collection }
  | PaletteCommand

export type PaletteGroup = { id: PaletteGroupId; label: string; items: PaletteItem[] }

export type PaletteCommands = { go: PaletteGo[]; common: PaletteRunnable[]; actions: PaletteRunnable[] }

const PAGES: { page: PalettePage; label: string; keywords: string }[] = [
  { page: 'home', label: 'Home', keywords: 'start dashboard overview' },
  { page: 'drafts', label: 'Drafts', keywords: 'my scenes private' },
  { page: 'activity', label: 'Activity', keywords: 'recent changes history feed' },
]

const SETTINGS_KEYWORDS: Record<SettingsPageId, string> = {
  general: 'workspace name sharing guests',
  members: 'people roles invites removed',
  teams: 'groups collection access',
  ai: 'model provider key',
  'api-keys': 'api keys tokens integrations mcp agent claude cursor',
  'audit-log': 'history record changes',
  account: 'profile preferences theme sign out',
  'account-workspaces': 'workspaces belong',
}

const THEMES: { theme: ThemePreference; label: string }[] = [
  { theme: 'light', label: 'Theme: Light' },
  { theme: 'dark', label: 'Theme: Dark' },
  { theme: 'system', label: 'Theme: Match system' },
]

export function paletteCommands({
  role,
  newScenePlaceName,
  theme,
  workspaces,
  currentSlug,
}: {
  role: WorkspaceRole
  newScenePlaceName: string
  theme: ThemePreference
  workspaces: readonly { slug: string; name: string }[]
  currentSlug: string
}): PaletteCommands {
  const isAdmin = canManageWorkspace(role)
  const canEdit = canEditScenes(role)
  const pages: PaletteGo[] = PAGES.map(({ page, label, keywords }) => ({ kind: 'go', key: `go:${page}`, label, keywords, destination: { page } }))
  const settings: PaletteGo[] = settingsPagesFor(isAdmin).map((page) => ({
    kind: 'go',
    key: `go:settings:${page.id}`,
    label: page.label,
    detail: page.group === 'account' ? SETTINGS_GROUP_LABELS.account : 'Settings',
    keywords: `settings ${SETTINGS_GROUP_LABELS[page.group]} ${SETTINGS_KEYWORDS[page.id]}`,
    destination: { settings: page.id },
  }))
  const common: PaletteRunnable[] = [
    ...(canEdit
      ? [
          { kind: 'action', key: 'action:new-scene', label: 'New scene', detail: `In ${newScenePlaceName}`, keywords: 'create add drawing canvas', action: 'new-scene' } as const,
        ]
      : []),
    ...(canManageCollections(role)
      ? [{ kind: 'action', key: 'action:new-collection', label: 'New collection', keywords: 'create add folder', action: 'new-collection' } as const]
      : []),
    ...(canEdit
      ? [{ kind: 'action', key: 'action:import', label: 'Import scenes', keywords: 'upload open file excalidraw', action: 'import' } as const]
      : []),
    ...(isAdmin ? [{ kind: 'action', key: 'action:invite', label: 'Invite people', keywords: 'add member link join', action: 'invite' } as const] : []),
  ]
  const themes: PaletteRunnable[] = THEMES.map(({ theme: option, label }) => ({
    kind: 'theme',
    key: `theme:${option}`,
    label,
    detail: option === theme ? 'Current' : undefined,
    keywords: 'appearance colour color mode',
    theme: option,
  }))
  const switches: PaletteRunnable[] = workspaces
    .filter((workspace) => workspace.slug !== currentSlug)
    .map((workspace) => ({
      kind: 'workspace',
      key: `workspace:${workspace.slug}`,
      label: `Switch to ${workspace.name}`,
      detail: 'Workspace',
      keywords: 'switch change workspace',
      slug: workspace.slug,
    }))
  return { go: [...pages, ...settings], common, actions: [...common, ...switches, ...themes] }
}

function words(query: string): string[] {
  return query.toLocaleLowerCase().split(/\s+/).filter(Boolean)
}

export function matchesQuery(text: string, query: string): boolean {
  const haystack = text.toLocaleLowerCase()
  return words(query).every((word) => haystack.includes(word))
}

export function matchesWords(text: string, query: string): boolean {
  const known = words(text.replace(/[^\p{L}\p{N}\s]/gu, ' '))
  return words(query).every((word) => known.some((candidate) => candidate.startsWith(word)))
}

function commandText(command: PaletteCommand): string {
  return `${command.label} ${command.detail ?? ''} ${command.keywords}`
}

function group(id: PaletteGroupId, items: PaletteItem[]): PaletteGroup[] {
  return items.length > 0 ? [{ id, label: PALETTE_GROUP_LABELS[id], items }] : []
}

function sceneItem(scene: SceneListItem): PaletteItem {
  return { kind: 'scene', key: `scene:${scene.id}`, label: scene.title, scene }
}

export function paletteGroups({
  query,
  scenes,
  recent,
  collections,
  commands,
}: {
  query: string
  scenes: readonly SceneListItem[]
  recent: readonly SceneListItem[]
  collections: readonly Collection[]
  commands: PaletteCommands
}): PaletteGroup[] {
  const typed = query.trim()
  if (typed === '') {
    return [
      ...group('recent', recent.map(sceneItem)),
      ...group('actions', commands.common),
      ...group('go', commands.go.filter((command) => 'page' in command.destination)),
    ]
  }
  return [
    ...group('scenes', scenes.map(sceneItem)),
    ...group(
      'collections',
      collections
        .filter((collection) => matchesQuery(collection.name, typed))
        .slice(0, PALETTE_COLLECTIONS_SHOWN)
        .map((collection) => ({ kind: 'collection', key: `collection:${collection.id}`, label: collection.name, collection })),
    ),
    ...group('go', commands.go.filter((command) => matchesWords(commandText(command), typed))),
    ...group('actions', commands.actions.filter((command) => matchesWords(commandText(command), typed))),
  ]
}

export function paletteItems(groups: readonly PaletteGroup[]): PaletteItem[] {
  return groups.flatMap((entry) => entry.items)
}

function destinationLink(destination: PaletteDestination, slug: string) {
  if ('settings' in destination) return settingsLink(slug, destination.settings)
  if (destination.page === 'drafts') return placeLink(slug, DRAFTS)
  if (destination.page === 'activity') return activityLink(slug)
  return workspaceLink(slug)
}

export type PaletteLink = ReturnType<typeof sceneLink> | ReturnType<typeof placeLink> | ReturnType<typeof destinationLink>

export type PaletteTarget = { link: PaletteLink } | { command: PaletteRunnable }

export function paletteTarget(item: PaletteItem, slug: string): PaletteTarget {
  switch (item.kind) {
    case 'scene':
      return { link: sceneLink(slug, item.scene.id) }
    case 'collection':
      return { link: placeLink(slug, item.collection.id) }
    case 'go':
      return { link: destinationLink(item.destination, slug) }
    default:
      return { command: item }
  }
}
