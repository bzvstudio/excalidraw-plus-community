import { Link } from '@tanstack/react-router'
import { type ReactNode, useState } from 'react'
import { AUTH_LINK, AuthCard } from '@/components/auth/auth-card'
import { TextField } from '@/components/auth/text-field'
import { Button } from '@/components/ui/button'
import { forgotPasswordSchema, type ForgotPasswordValues } from '@/helpers/auth-forms'
import { useFormSubmission } from '@/hooks/use-form-submission'
import { requestPasswordReset } from '@/services/auth/session'
import type { SubmitResult } from '@/types/forms'

export function ForgotPasswordRoute() {
  return (
    <ForgotPasswordPage
      onSubmit={({ email }) => requestPasswordReset(email)}
      signInLink={
        <Link to="/sign-in" className={AUTH_LINK}>
          Back to sign in
        </Link>
      }
    />
  )
}

export function ForgotPasswordPage({
  onSubmit,
  signInLink,
}: {
  onSubmit: (values: ForgotPasswordValues) => Promise<SubmitResult>
  signInLink: ReactNode
}) {
  const [sentTo, setSentTo] = useState<string>()
  const { register, errors, isSubmitting, error, submit } = useFormSubmission(forgotPasswordSchema, async (values) => {
    const result = await onSubmit(values)
    if (!result.error) setSentTo(values.email)
    return result
  })

  const footer = <p>{signInLink}</p>

  if (sentTo) {
    return (
      <AuthCard
        title="Check your inbox"
        description={
          <>
            If <span className="font-medium [overflow-wrap:anywhere] text-foreground">{sentTo}</span> has an account here, a
            link to choose a new password is on its way. It works once, within an hour.
          </>
        }
        footer={footer}
      />
    )
  }

  return (
    <AuthCard
      title="Reset your password"
      description="Enter your email and we'll send you a link to choose a new one."
      error={error}
      footer={footer}
    >
      <form onSubmit={submit} noValidate className="flex flex-col gap-4">
        <TextField id="email" label="Email" type="email" autoComplete="email" registration={register('email')} error={errors.email} />
        <Button type="submit" size="lg" disabled={isSubmitting}>
          {isSubmitting ? 'Sending…' : 'Email me a link'}
        </Button>
      </form>
    </AuthCard>
  )
}
