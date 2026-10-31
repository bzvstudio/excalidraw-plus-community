import { sceneCoordsToViewportCoords, viewportCoordsToSceneCoords } from '@excalidraw/excalidraw'
import type { SceneElement } from '@repo/api'
import type { ScenePoint } from '@repo/api/comments.utils'
import type { EditorApi } from './files'
import { toSceneElements } from './scene-adapter'

export function sceneElementsOf(api: EditorApi): SceneElement[] {
  return toSceneElements(api.getSceneElementsIncludingDeleted())
}

export function sceneElementsById(api: EditorApi): Map<string, SceneElement> {
  return new Map(sceneElementsOf(api).map((element) => [element.id, element]))
}

export function onScreen(api: EditorApi, point: ScenePoint): ScenePoint {
  const { x, y } = sceneCoordsToViewportCoords({ sceneX: point.x, sceneY: point.y }, api.getAppState())
  return { x, y }
}

export function inScene(api: EditorApi, point: ScenePoint): ScenePoint {
  const { x, y } = viewportCoordsToSceneCoords({ clientX: point.x, clientY: point.y }, api.getAppState())
  return { x, y }
}

export function bringIntoView(api: EditorApi, point: ScenePoint) {
  api.setViewport({ target: [point.x - 1, point.y - 1, point.x + 1, point.y + 1], fit: 'none' })
}

export function onViewChange(api: EditorApi, changed: () => void): () => void {
  const offScroll = api.onScrollChange(changed)
  const offChange = api.onChange(changed)
  return () => {
    offScroll()
    offChange()
  }
}
