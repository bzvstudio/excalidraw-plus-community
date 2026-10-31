import { DRAFTS } from '@repo/api/scenes.const'
import { ALL_PLACES, EVERYONE, OTHERS_DRAFTS } from '@/constants/activity'
import { dayLabel, timeAgo } from '@/helpers/time'
import type { SceneListItem } from '@/types/api'

export type ActivityFilter = { place: string; person: string }

export type ActivitySearch = { place?: string; person?: string }

export function activityFilterOf(search: ActivitySearch): ActivityFilter {
  return { place: search.place ?? ALL_PLACES, person: search.person ?? EVERYONE }
}

export function activitySearchOf(filter: ActivityFilter): ActivitySearch {
  return {
    ...(filter.place !== ALL_PLACES && { place: filter.place }),
    ...(filter.person !== EVERYONE && { person: filter.person }),
  }
}

export function validateActivitySearch(search: Record<string, unknown>): ActivitySearch {
  const text = (value: unknown) => (typeof value === 'string' && value.length > 0 && value.length <= 64 ? value : undefined)
  const place = text(search.place)
  const person = text(search.person)
  return { ...(place && { place }), ...(person && { person }) }
}

export function editorName(scene: SceneListItem): string {
  return scene.updatedByName ?? 'Someone'
}

export type ActivityDay = { label: string; scenes: SceneListItem[] }

export function activityDays(scenes: readonly SceneListItem[], now: Date = new Date()): ActivityDay[] {
  const days: ActivityDay[] = []
  for (const scene of scenes) {
    const label = dayLabel(new Date(scene.updatedAt), now)
    const day = days.at(-1)
    if (day?.label === label) day.scenes.push(scene)
    else days.push({ label, scenes: [scene] })
  }
  return days
}

export function activityPeople(scenes: readonly SceneListItem[]): { id: string; name: string }[] {
  const people = new Map<string, string>()
  for (const scene of scenes) {
    if (scene.updatedBy && !people.has(scene.updatedBy)) people.set(scene.updatedBy, editorName(scene))
  }
  return [...people].map(([id, name]) => ({ id, name })).sort((a, b) => a.name.localeCompare(b.name))
}

function inPlace(scene: SceneListItem, place: string, userId: string): boolean {
  if (place === ALL_PLACES) return true
  if (place === DRAFTS) return scene.collectionId === null && scene.createdBy === userId
  if (place === OTHERS_DRAFTS) return scene.collectionId === null && scene.createdBy !== userId
  return scene.collectionId === place
}

export function filterActivity(scenes: readonly SceneListItem[], filter: ActivityFilter, userId: string): SceneListItem[] {
  return scenes.filter(
    (scene) => inPlace(scene, filter.place, userId) && (filter.person === EVERYONE || scene.updatedBy === filter.person),
  )
}

export function hasOthersDrafts(scenes: readonly SceneListItem[], userId: string): boolean {
  return scenes.some((scene) => scene.collectionId === null && scene.createdBy !== userId)
}

export function isFiltered(filter: ActivityFilter): boolean {
  return filter.place !== ALL_PLACES || filter.person !== EVERYONE
}

export function activityTime(date: Date, now: Date = new Date()): string {
  if (dayLabel(date, now) === 'Today') return timeAgo(date, now)
  return date.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })
}

export function draftOwnerName(scene: Pick<SceneListItem, 'createdByName'>): string {
  return `${scene.createdByName ?? 'Someone'}’s draft`
}

export function placeNameOf(scene: SceneListItem, collectionNames: ReadonlyMap<string, string>, userId: string): string {
  if (scene.collectionId === null) {
    return scene.createdBy === userId ? 'Drafts' : draftOwnerName(scene)
  }
  return collectionNames.get(scene.collectionId) ?? 'A collection'
}
