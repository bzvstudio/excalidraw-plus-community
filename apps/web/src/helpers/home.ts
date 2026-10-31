import { JUMP_BACK_IN_LIMIT } from '@/constants/home'
import type { RecentVisit } from '@/helpers/recent-visits'
import type { Collection, SceneListItem } from '@/types/api'

export type CollectionSummary = { collection: Collection; sceneCount: number; lastChangedAt: string | undefined }

export type DraftsSummary = { sceneCount: number; lastChangedAt: string | undefined }

export function jumpBackIn(
  scenes: readonly SceneListItem[],
  visits: readonly RecentVisit[],
  userId: string,
  limit: number = JUMP_BACK_IN_LIMIT,
): SceneListItem[] {
  const visited = new Map(visits.map((visit, order) => [visit.sceneId, { at: visit.at, order }]))
  return scenes
    .flatMap((scene) => {
      const visit = visited.get(scene.id)
      const edited = scene.updatedBy === userId ? new Date(scene.updatedAt).getTime() : undefined
      if (!visit && edited === undefined) return []
      return [{ scene, touched: Math.max(visit?.at ?? 0, edited ?? 0), order: visit?.order ?? visits.length }]
    })
    .sort((a, b) => b.touched - a.touched || a.order - b.order)
    .slice(0, limit)
    .map(({ scene }) => scene)
}

function latest(current: string | undefined, next: string): string {
  return current === undefined || next > current ? next : current
}

export function collectionSummaries(collections: readonly Collection[], scenes: readonly SceneListItem[]): CollectionSummary[] {
  const byId = new Map<string, CollectionSummary>(
    collections.map((collection) => [collection.id, { collection, sceneCount: 0, lastChangedAt: undefined }]),
  )
  for (const scene of scenes) {
    const summary = scene.collectionId ? byId.get(scene.collectionId) : undefined
    if (!summary) continue
    summary.sceneCount += 1
    summary.lastChangedAt = latest(summary.lastChangedAt, scene.updatedAt)
  }
  return [...byId.values()].sort(
    (a, b) =>
      (b.lastChangedAt ?? '').localeCompare(a.lastChangedAt ?? '') || a.collection.name.localeCompare(b.collection.name),
  )
}

export function draftsSummary(scenes: readonly SceneListItem[], userId: string): DraftsSummary {
  let sceneCount = 0
  let lastChangedAt: string | undefined
  for (const scene of scenes) {
    if (scene.collectionId !== null || scene.createdBy !== userId) continue
    sceneCount += 1
    lastChangedAt = latest(lastChangedAt, scene.updatedAt)
  }
  return { sceneCount, lastChangedAt }
}

export function yourSceneCount(scenes: readonly SceneListItem[], userId: string): number {
  return scenes.filter((scene) => scene.collectionId !== null || scene.createdBy === userId).length
}

export function countLabel(count: number, one: string, many: string): string {
  return `${count} ${count === 1 ? one : many}`
}

export function sceneCountLabel(count: number): string {
  return count === 0 ? 'No scenes' : countLabel(count, 'scene', 'scenes')
}

export function greeting(name: string, now: Date = new Date()): string {
  const hour = now.getHours()
  const part = hour < 5 ? 'evening' : hour < 12 ? 'morning' : hour < 18 ? 'afternoon' : 'evening'
  const firstName = name.trim().split(/\s+/)[0]
  return firstName ? `Good ${part}, ${firstName}` : `Good ${part}`
}
