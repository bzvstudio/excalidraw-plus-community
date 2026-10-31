import { readPersonValue, writePersonValue } from '@/helpers/person-storage'
import type { SceneListItem } from '@/types/api'

export const SCENE_SORTS = [
  { value: 'updated', label: 'Last edited' },
  { value: 'created', label: 'Created' },
  { value: 'title', label: 'Name' },
] as const

export type SceneSort = (typeof SCENE_SORTS)[number]['value']

export const SCENE_VIEWS = ['grid', 'list'] as const

export type SceneView = (typeof SCENE_VIEWS)[number]

function stored<Value extends string>(name: string, userId: string, values: readonly Value[], fallback: Value): Value {
  const value = readPersonValue(name, userId)
  return values.find((option) => option === value) ?? fallback
}

export function storedSort(userId: string): SceneSort {
  return stored(
    'scene-sort',
    userId,
    SCENE_SORTS.map(({ value }) => value),
    'updated',
  )
}

export function storeSort(userId: string, sort: SceneSort): void {
  writePersonValue('scene-sort', userId, sort)
}

export function storedView(userId: string): SceneView {
  return stored('scene-view', userId, SCENE_VIEWS, 'grid')
}

export function storeView(userId: string, view: SceneView): void {
  writePersonValue('scene-view', userId, view)
}

export function sortLabel(sort: SceneSort): string {
  return SCENE_SORTS.find(({ value }) => value === sort)!.label
}

export function sortScenes(scenes: readonly SceneListItem[], sort: SceneSort): SceneListItem[] {
  if (sort === 'title') return scenes.toSorted((a, b) => a.title.localeCompare(b.title, undefined, { sensitivity: 'base' }) || a.id.localeCompare(b.id))
  const key = sort === 'created' ? 'createdAt' : 'updatedAt'
  const time = (value: string) => new Date(value).getTime() || 0
  return scenes.toSorted((a, b) => time(b[key]) - time(a[key]) || a.id.localeCompare(b.id))
}
