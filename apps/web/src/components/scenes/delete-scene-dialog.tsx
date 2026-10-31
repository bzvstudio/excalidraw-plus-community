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
import type { SceneListItem } from '@/types/api'
import type { SubmitResult } from '@/types/forms'

export function DeleteSceneDialog({
  scene,
  onConfirm,
  onClose,
}: {
  scene: Pick<SceneListItem, 'title'>
  onConfirm: () => Promise<SubmitResult>
  onClose: () => void
}) {
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState<string>()

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
          <AlertDialogTitle>Delete “{scene.title}”?</AlertDialogTitle>
          <AlertDialogDescription>
            The scene, its comments and its share links go for good. Nobody can open it afterwards.
          </AlertDialogDescription>
        </AlertDialogHeader>
        {error && (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        )}
        <AlertDialogFooter>
          <AlertDialogCancel disabled={deleting}>Keep it</AlertDialogCancel>
          <AlertDialogAction variant="destructive" disabled={deleting} onClick={() => void confirm()}>
            {deleting ? 'Deleting…' : 'Delete scene'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
