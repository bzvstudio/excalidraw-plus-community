import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import type { SubmitResult } from '@/types/forms'

export function NameDialog({
  title,
  label,
  initial = '',
  submitLabel = 'Save',
  maxLength,
  onClose,
  onSubmit,
}: {
  title: string
  label: string
  initial?: string
  submitLabel?: string
  maxLength: number
  onClose: () => void
  onSubmit: (name: string) => Promise<SubmitResult>
}) {
  const [name, setName] = useState(initial)
  const [error, setError] = useState<string>()

  const submit = async (event: React.FormEvent) => {
    event.preventDefault()
    if (name.trim() === '') return setError(`${label} is required`)
    const result = await onSubmit(name.trim())
    if (result.error) setError(result.error)
    else onClose()
  }

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent showCloseButton={false} className="gap-4 sm:max-w-md">
        <DialogTitle>{title}</DialogTitle>
        <form onSubmit={submit} noValidate>
          <label className="flex flex-col gap-2 text-sm font-medium">
            <span>{label}</span>
            <Input
              value={name}
              onChange={(event) => {
                setName(event.target.value)
                setError(undefined)
              }}
              autoFocus
              maxLength={maxLength}
              aria-invalid={error ? true : undefined}
            />
          </label>
          <p role={error ? 'alert' : undefined} className="min-h-5 pt-1.5 text-xs text-destructive">
            {error ?? '\u00a0'}
          </p>
          <div className="mt-3 flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit">
              {submitLabel}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
