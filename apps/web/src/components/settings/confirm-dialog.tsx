import { type ReactNode, useState } from 'react'
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
import type { SubmitResult } from '@/types/forms'

export function ConfirmDialog({
  open = true,
  title,
  description,
  action,
  busyAction,
  cancel = 'Cancel',
  destructive = true,
  onConfirm,
  onClose,
}: {
  open?: boolean
  title: string
  description: ReactNode
  action?: string
  busyAction?: string
  cancel?: string
  destructive?: boolean
  onConfirm?: () => Promise<SubmitResult>
  onClose: () => void
}) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string>()

  const confirm = async () => {
    if (!onConfirm) return
    setBusy(true)
    const result = await onConfirm()
    setBusy(false)
    if (result.error) setError(result.error)
    else onClose()
  }

  return (
    <AlertDialog open={open} onOpenChange={(next) => !next && !busy && onClose()} onOpenChangeComplete={(next) => next || setError(undefined)}>
      <AlertDialogContent finalFocus={false} className="flex flex-col gap-5">
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        {error && (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        )}
        <AlertDialogFooter>
          <AlertDialogCancel disabled={busy}>{cancel}</AlertDialogCancel>
          {action && onConfirm && (
            <AlertDialogAction variant={destructive ? 'destructive' : 'default'} disabled={busy} onClick={() => void confirm()}>
              {busy ? (busyAction ?? action) : action}
            </AlertDialogAction>
          )}
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
