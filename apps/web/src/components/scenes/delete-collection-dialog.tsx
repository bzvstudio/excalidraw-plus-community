import { useState } from 'react'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { sceneCountLabel } from '@/helpers/home'
import type { Collection } from '@/types/api'
import type { SubmitResult } from '@/types/forms'

export function DeleteCollectionDialog({
  collection,
  sceneCount,
  onConfirm,
  onClose,
}: {
  collection: Pick<Collection, 'name'>
  sceneCount?: number
  onConfirm: () => Promise<SubmitResult>
  onClose: () => void
}) {
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState<string>()
  const holdsScenes = sceneCount !== undefined && sceneCount > 0

  const confirm = async () => {
    setDeleting(true)
    const result = await onConfirm()
    setDeleting(false)
    if (result.error) setError(result.error)
    else onClose()
  }

  return (
    <AlertDialog open onOpenChange={(open) => !open && !deleting && onClose()}>
      <AlertDialogContent className="flex flex-col gap-5">
        <AlertDialogHeader>
          <AlertDialogTitle>
            {holdsScenes ? `“${collection.name}” still holds ${sceneCountLabel(sceneCount)}` : `Delete “${collection.name}”?`}
          </AlertDialogTitle>
          <AlertDialogDescription>
            {holdsScenes
              ? 'Only an empty collection can be deleted, so no scene is lost by accident. Move its scenes somewhere else, or delete them, and try again.'
              : sceneCount === 0
                ? 'It holds no scenes, so nothing else goes with it. Anyone with a link to it will find it gone.'
                : 'Only an empty collection can be deleted, so no scene is lost by accident. Anyone with a link to it will find it gone.'}
          </AlertDialogDescription>
        </AlertDialogHeader>
        {error && (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        )}
        <AlertDialogFooter>
          {holdsScenes ? (
            <AlertDialogCancel>Close</AlertDialogCancel>
          ) : (
            <>
              <AlertDialogCancel disabled={deleting}>Keep it</AlertDialogCancel>
              <AlertDialogAction variant="destructive" disabled={deleting} onClick={() => void confirm()}>
                {deleting ? 'Deleting…' : 'Delete collection'}
              </AlertDialogAction>
            </>
          )}
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
