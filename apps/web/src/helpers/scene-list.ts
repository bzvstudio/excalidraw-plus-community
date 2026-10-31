import { DRAFTS } from '@repo/api/scenes.const'
import type { SceneListItem } from '@/types/api'

export function placeOfListKey(key: readonly unknown[]): string | undefined {
  const options = key[1] as { input?: { in?: unknown } } | undefined
  return typeof options?.input?.in === 'string' ? options.input.in : undefined
}

export function renamedIn(list: readonly SceneListItem[], sceneId: string, from: string, to: string): SceneListItem[] {
  return list.map((scene) => (scene.id === sceneId && scene.title === from ? { ...scene, title: to } : scene))
}

export function withoutScene(list: readonly SceneListItem[], sceneId: string): SceneListItem[] {
  return list.filter((scene) => scene.id !== sceneId)
}

export function withScene(list: readonly SceneListItem[], scene: SceneListItem, index = list.length): SceneListItem[] {
  if (list.some(({ id }) => id === scene.id)) return [...list]
  const at = Math.min(Math.max(index, 0), list.length)
  return [...list.slice(0, at), scene, ...list.slice(at)]
}

export function movedIn(
  list: readonly SceneListItem[],
  place: string | undefined,
  scene: SceneListItem,
  to: string | null,
): SceneListItem[] {
  const moved = { ...scene, collectionId: to }
  if (place === undefined) return list.map((item) => (item.id === scene.id ? moved : item))
  if (place !== (to ?? DRAFTS)) return withoutScene(list, scene.id)
  return withScene(list, moved)
}

export function ownDrafts(list: readonly SceneListItem[], userId: string): SceneListItem[] {
  return list.filter((scene) => scene.collectionId === null && scene.createdBy === userId)
}

export function othersDrafts(list: readonly SceneListItem[], userId: string): SceneListItem[] {
  return list.filter((scene) => scene.collectionId === null && scene.createdBy !== userId)
}
