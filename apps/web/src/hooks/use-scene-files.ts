import type { SceneElement } from '@repo/api'
import { useCallback, useRef, useState } from 'react'
import { dataUrlBytes, type EditorApi, type EditorFiles, referencedFileIds, toEditorFile } from '@/editor/files'
import { FileRefused, type FileTransfer } from '@/services/files/files'

const REFUSED_FILE_STATUSES = [413, 415]

export function useSceneFiles(options: { transfer: FileTransfer; initialElements: readonly SceneElement[] }) {
  const { transfer, initialElements } = options
  const [stored] = useState(() => new Set(referencedFileIds(initialElements)))
  const refused = useRef(new Set<string>())
  const latest = useRef<EditorFiles>({})
  const editor = useRef<EditorApi | undefined>(undefined)
  const requested = useRef(new Set<string>())
  const announced = useRef(new Set<string>())
  const unavailable = useRef(new Set<string>())

  const fetchMissing = useCallback(
    async function fetchFiles(elements: readonly SceneElement[]): Promise<void> {
      const api = editor.current
      if (!api) return
      const loaded = api.getFiles()
      const missing = referencedFileIds(elements).filter((id) => !loaded[id] && !requested.current.has(id))
      for (const id of missing) requested.current.add(id)
      const fetched = await Promise.all(
        missing.map(async (id) => {
          const blob = await transfer.download(id).catch(() => undefined)
          const file = blob && (await toEditorFile(id, blob).catch(() => undefined))
          if (file) stored.add(id)
          return { id, file }
        }),
      )
      const files = fetched.flatMap(({ file }) => (file ? [file] : []))
      if (files.length > 0) api.addFiles(files)
      const failed = fetched.filter(({ file }) => !file).map(({ id }) => id)
      const retry = failed.filter((id) => announced.current.delete(id))
      for (const id of failed) {
        if (retry.includes(id)) requested.current.delete(id)
        else unavailable.current.add(id)
      }
      if (retry.length > 0) await fetchFiles(elements)
    },
    [transfer, stored],
  )

  const fileReady = useCallback(
    (fileId: string, elements: readonly SceneElement[]) => {
      if (stored.has(fileId)) return
      if (unavailable.current.delete(fileId)) requested.current.delete(fileId)
      else if (requested.current.has(fileId)) return void announced.current.add(fileId)
      void fetchMissing(elements)
    },
    [fetchMissing, stored],
  )

  const onReady = useCallback(
    (api: EditorApi) => {
      editor.current = api
      void fetchMissing(initialElements)
    },
    [fetchMissing, initialElements],
  )

  const onFilesChange = useCallback((files: EditorFiles) => {
    latest.current = files
  }, [])

  const uploadReferenced = useCallback(
    async (elements: readonly SceneElement[]) => {
      const waiting = referencedFileIds(elements).flatMap((id) => {
        const file = latest.current[id]
        return file && !stored.has(id) && !refused.current.has(id) ? [file] : []
      })
      await Promise.all(
        waiting.map(async ({ id, dataURL }) => {
          try {
            await transfer.upload(id, dataUrlBytes(dataURL))
            stored.add(id)
          } catch (error) {
            if (!(error instanceof FileRefused) || !REFUSED_FILE_STATUSES.includes(error.status)) throw error
            refused.current.add(id)
            editor.current?.setToast({ message: `This image was not saved: ${error.message}`, closable: true })
          }
        }),
      )
    },
    [transfer, stored],
  )

  return { onReady, onFilesChange, uploadReferenced, fetchMissing, fileReady }
}
