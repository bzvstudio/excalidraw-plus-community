import type { SceneAppState } from '@repo/api'
import { SCENE_APP_STATE_KEYS } from '@repo/api/scenes.const'

export type Versioned = { id: string; version: number }

export function sceneAppStateOf(appState: Record<string, unknown>): SceneAppState {
  return Object.fromEntries(SCENE_APP_STATE_KEYS.map((key) => [key, appState[key]]))
}

export function unsavedElements<Element extends Versioned>(
  elements: readonly Element[],
  savedVersions: ReadonlyMap<string, number>,
): Element[] {
  return elements.filter((element) => savedVersions.get(element.id) !== element.version)
}

export function withSavedVersions(
  savedVersions: ReadonlyMap<string, number>,
  sent: readonly Versioned[],
): Map<string, number> {
  const next = new Map(savedVersions)
  for (const element of sent) next.set(element.id, element.version)
  return next
}

export function versionsOf(elements: readonly Versioned[]): Map<string, number> {
  return new Map(elements.map((element) => [element.id, element.version]))
}

export function isRefusalStatus(status: number): boolean {
  return status >= 400 && status < 500 && status !== 408 && status !== 429
}

export function retryDelay(attempt: number, firstMs: number, maxMs: number): number {
  return Math.min(firstMs * 2 ** attempt, maxMs)
}
