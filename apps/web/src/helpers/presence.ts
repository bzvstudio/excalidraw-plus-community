import type { SceneBounds } from '@repo/api'

export type Peer = { id: string; name: string; avatarId: string | null }

export type PresenceColor = { background: string; stroke: string }

export function colorOf(id: string): PresenceColor {
  let hash = 0
  for (const character of id) hash = (hash * 31 + character.charCodeAt(0)) >>> 0
  const hue = hash % 360
  return { background: `hsl(${hue}, 100%, 83%)`, stroke: `hsl(${hue}, 100%, 35%)` }
}

export function selectedIds(selected: Readonly<Record<string, boolean>>): string[] {
  return Object.keys(selected)
    .filter((id) => selected[id])
    .sort()
}

export type Viewport = {
  scrollX: number
  scrollY: number
  width: number
  height: number
  zoom: { value: number }
}

export function visibleBounds(viewport: Viewport): SceneBounds {
  const left = -viewport.scrollX
  const top = -viewport.scrollY
  return [left, top, left + viewport.width / viewport.zoom.value, top + viewport.height / viewport.zoom.value]
}
