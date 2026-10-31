export const PALETTE_SCENES_SHOWN = 8

export const PALETTE_RECENT_SHOWN = 5

export const PALETTE_COLLECTIONS_SHOWN = 6

export const PALETTE_SEARCH_DELAY_MS = 150

export const PALETTE_PLACEHOLDER = 'Search scenes, collections and commands'

export const PALETTE_PLACEHOLDER_NARROW = 'Search scenes and commands'

export const PALETTE_GROUP_LABELS = {
  recent: 'Recent scenes',
  scenes: 'Scenes',
  collections: 'Collections',
  go: 'Go to',
  actions: 'Actions',
} as const

export type PaletteGroupId = keyof typeof PALETTE_GROUP_LABELS
