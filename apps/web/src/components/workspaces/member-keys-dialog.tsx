import { type ReactNode, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { SCOPE_LABELS } from '@/constants/api-keys'
import type { ApiKeyItem } from '@/types/api'
import type { SubmitResult } from '@/types/forms'

export function MemberKeysDialog({
  title,
  consequence,
  action,
  keys,
  self = false,
  ready = true,
  children,
  onClose,
  onConfirm,
}: {
  title: string
  consequence: string
  action: string
  keys: ApiKeyItem[] | 'loading' | 'failed'
  self?: boolean
  ready?: boolean
  children?: ReactNode
  onClose: () => void
  onConfirm: (revokeKeyIds: string[]) => Promise<SubmitResult>
}) {
  const they = self ? 'you' : 'they'
  const listed = Array.isArray(keys) ? keys : []
  const [unticked, setUnticked] = useState<ReadonlySet<string>>(new Set())
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string>()

  const toggle = (keyId: string) =>
    setUnticked((current) => {
      const next = new Set(current)
      if (!next.delete(keyId)) next.add(keyId)
      return next
    })

  const revoking = listed.filter(({ id }) => !unticked.has(id))

  const submit = async (event: React.FormEvent) => {
    event.preventDefault()
    setBusy(true)
    const result = await onConfirm(revoking.map(({ id }) => id))
    setBusy(false)
    if (result.error) setError(result.error)
    else onClose()
  }

  return (
    <AlertDialog open onOpenChange={(open) => !open && !busy && onClose()}>
      <AlertDialogContent className="sm:max-w-md">
        <form onSubmit={submit} className="flex flex-col gap-5">
          <AlertDialogHeader>
            <AlertDialogTitle>{title}</AlertDialogTitle>
            <AlertDialogDescription>
              {consequence}
              {listed.length > 0 &&
                ` Keys ${they} made belong to the workspace and keep working after ${they} go, so revoke any ${they} might still hold.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          {children}
          {keys === 'loading' && <p className="text-sm text-muted-foreground">Checking for API keys {they} made…</p>}
          {keys === 'failed' && (
            <p role="alert" className="text-sm text-destructive">
              {self ? 'Your' : 'Their'} API keys couldn’t be loaded. Close this and try again, or look under Settings › API keys.
            </p>
          )}
          {listed.length > 0 && (
              <fieldset className="flex flex-col gap-2">
                <legend className="mb-1 text-sm font-medium">Revoke keys {they} made</legend>
                {listed.map((key) => (
                  <label key={key.id} className="flex items-center gap-2 text-sm">
                    <Checkbox
                      checked={!unticked.has(key.id)}
                      onChange={() => toggle(key.id)}
                    />
                    {key.name}
                    <span className="text-muted-foreground">
                      {SCOPE_LABELS[key.scope]} · <span className="font-mono">{key.visiblePrefix}…</span>
                    </span>
                  </label>
                ))}
              </fieldset>
          )}
          {error && (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          )}
          <AlertDialogFooter>
            <Button type="button" variant="outline" onClick={onClose} disabled={busy}>
              Cancel
            </Button>
            <Button type="submit" variant="destructive" disabled={busy || !ready || !Array.isArray(keys)}>
              {revoking.length > 0 ? `${action} and revoke ${revoking.length === 1 ? '1 key' : `${revoking.length} keys`}` : action}
            </Button>
          </AlertDialogFooter>
        </form>
      </AlertDialogContent>
    </AlertDialog>
  )
}
