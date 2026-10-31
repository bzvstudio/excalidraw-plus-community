import { exportScene } from '@excalidraw/excalidraw'
import type { NonDeletedExcalidrawElement, OrderedExcalidrawElement } from '@excalidraw/element/types'
import type { SceneAppState } from '@repo/api'
import { THUMBNAIL_MAX_BYTES } from '@repo/api/thumbnails.const'
import type { EditorFiles } from './files'

const THUMBNAIL_SIZES = [480, 320, 200]

export type ThumbnailSource = {
  elements: readonly OrderedExcalidrawElement[]
  appState: SceneAppState
  files: EditorFiles
}

export async function renderThumbnail(source: ThumbnailSource): Promise<Blob | undefined> {
  const elements = source.elements.filter((element): element is NonDeletedExcalidrawElement & OrderedExcalidrawElement => !element.isDeleted)
  if (elements.length === 0) return undefined
  for (const maxWidthOrHeight of THUMBNAIL_SIZES) {
    const png = await exportScene({
      data: { elements, appState: source.appState, files: source.files },
      type: 'png',
      config: { maxWidthOrHeight },
    })
    if (png.size <= THUMBNAIL_MAX_BYTES) return png
  }
  return undefined
}
