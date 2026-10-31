import { loadFromBlob } from '@excalidraw/excalidraw'
import type { SceneAppState, SceneElement } from '@repo/api'
import { sceneAppStateOf } from '@/helpers/scene-sync'
import { dataUrlBytes, referencedFileIds } from './files'
import { toSceneElements } from './scene-adapter'
import { renderThumbnail } from './thumbnail'

export type SceneFileContent = {
  elements: SceneElement[]
  appState: SceneAppState
  files: { id: string; bytes: Uint8Array<ArrayBuffer> }[]
  thumbnail: Blob | undefined
}

export async function readSceneFile(file: Blob): Promise<SceneFileContent> {
  const scene = await loadFromBlob(file, null, null)
  const elements = toSceneElements(scene.elements)
  const used = new Set(referencedFileIds(elements))
  const appState = sceneAppStateOf(scene.appState as unknown as Record<string, unknown>)
  return {
    elements,
    appState,
    files: Object.values(scene.files)
      .filter((data) => used.has(data.id))
      .map((data) => ({ id: data.id, bytes: dataUrlBytes(data.dataURL) })),
    thumbnail: await renderThumbnail({ elements: scene.elements, appState, files: scene.files }).catch(() => undefined),
  }
}
