import type { SceneAppState, SceneElement } from '@repo/api'
import type { OrderedExcalidrawElement } from '@excalidraw/element/types'
import type { AppState, LibraryItems } from '@excalidraw/excalidraw/types'
import type { LibraryItemData } from '@/types/api'

export function toSceneElements(elements: readonly OrderedExcalidrawElement[]): SceneElement[] {
  return elements as unknown as SceneElement[]
}

export function fromSceneElements(elements: readonly SceneElement[]): OrderedExcalidrawElement[] {
  return elements as unknown as OrderedExcalidrawElement[]
}

export function fromSceneAppState(appState: SceneAppState): Pick<AppState, keyof SceneAppState> {
  return appState as Pick<AppState, keyof SceneAppState>
}

export function toLibraryItemData(items: readonly LibraryItems[number][]): LibraryItemData[] {
  return items as unknown as LibraryItemData[]
}

export function fromLibraryItemData(items: readonly LibraryItemData[]): LibraryItems[number][] {
  return items as unknown as LibraryItems[number][]
}
