import type { ExcalidrawImperativeAPI, BinaryFileData, BinaryFiles, DataURL } from '@excalidraw/excalidraw/types'
import type { FileId } from '@excalidraw/element/types'
import type { SceneElement } from '@repo/api'

export type EditorApi = ExcalidrawImperativeAPI

export type EditorFiles = BinaryFiles

export function referencedFileIds(elements: readonly SceneElement[]): string[] {
  const ids = elements.flatMap((element) =>
    element.type === 'image' && !element.isDeleted && typeof element.fileId === 'string' ? [element.fileId] : [],
  )
  return [...new Set(ids)]
}

export function dataUrlBytes(dataUrl: string): Uint8Array<ArrayBuffer> {
  const comma = dataUrl.indexOf(',')
  const header = dataUrl.slice(0, comma)
  const payload = dataUrl.slice(comma + 1)
  if (header.endsWith(';base64')) return Uint8Array.from(atob(payload), (char) => char.charCodeAt(0))
  return new TextEncoder().encode(decodeURIComponent(payload))
}

export function dataUrlOf(blob: Blob): Promise<DataURL> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as DataURL)
    reader.onerror = () => reject(reader.error ?? new Error('The image could not be read'))
    reader.readAsDataURL(blob)
  })
}

export async function toEditorFile(id: string, blob: Blob): Promise<BinaryFileData> {
  return {
    id: id as FileId,
    mimeType: blob.type as BinaryFileData['mimeType'],
    dataURL: await dataUrlOf(blob),
    created: Date.now(),
  }
}
