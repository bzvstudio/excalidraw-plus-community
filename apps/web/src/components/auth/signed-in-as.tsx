import { useState } from 'react'
import { AUTH_LINK } from '@/components/auth/auth-card'
import type { SubmitResult } from '@/types/forms'

export function SignedInAs({ email, onSignOut }: { email: string; onSignOut: () => Promise<SubmitResult> }) {
  const [leaving, setLeaving] = useState(false)
  const [error, setError] = useState<string>()

  const leave = async () => {
    setLeaving(true)
    setError(undefined)
    const result = await onSignOut()
    setLeaving(false)
    setError(result.error)
  }

  return (
    <>
      <p className="text-pretty">
        Signed in as <span className="font-medium [overflow-wrap:anywhere] text-foreground">{email}</span>.{' '}
        <button type="button" className={AUTH_LINK} disabled={leaving} onClick={leave}>
          {leaving ? 'Signing out…' : 'Not you?'}
        </button>
      </p>
      {error && (
        <p role="alert" className="text-destructive">
          {error}
        </p>
      )}
    </>
  )
}
