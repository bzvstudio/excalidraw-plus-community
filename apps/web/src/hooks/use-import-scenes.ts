import { useNavigate } from '@tanstack/react-router'
import { useCallback, useRef, useState } from 'react'
import { toast } from 'sonner'
import { sceneLink } from '@/helpers/places'
import { importScenes } from '@/services/scenes/scenes'

export function useImportScenes({
  workspaceId,
  workspaceSlug,
  collectionId,
  placeName,
}: {
  workspaceId: string
  workspaceSlug: string
  collectionId?: string
  placeName: string
}) {
  const navigate = useNavigate()
  const [importing, setImporting] = useState(false)
  const busy = useRef(false)

  const importFiles = useCallback(
    async (files: File[]) => {
      if (busy.current || files.length === 0) return
      busy.current = true
      setImporting(true)
      const { imported, failed } = await importScenes(workspaceId, files, collectionId)
      busy.current = false
      setImporting(false)
      if (failed.length > 0) {
        toast.error(`Imported ${imported.length} of ${files.length}`, {
          description: failed.map(({ name, message }) => `${name}: ${message}`).join(' '),
        })
      } else if (files.length === 1 && imported.length === 1) await navigate(sceneLink(workspaceSlug, imported[0]!.id))
      else toast.success(`Imported ${files.length} scenes into ${placeName}`)
    },
    [collectionId, navigate, placeName, workspaceId, workspaceSlug],
  )

  return { importing, importFiles }
}
