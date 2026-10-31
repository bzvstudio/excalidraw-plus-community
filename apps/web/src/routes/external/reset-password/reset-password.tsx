import { Link } from '@tanstack/react-router'
import { type ReactNode, useState } from 'react'
import { AUTH_LINK, AuthCard } from '@/components/auth/auth-card'
import { TextField } from '@/components/auth/text-field'
import { Button, buttonVariants } from '@/components/ui/button'
import { NEW_PASSWORD_HINT, resetPasswordSchema, type ResetPasswordValues } from '@/helpers/auth-forms'
import { useFormSubmission } from '@/hooks/use-form-submission'
import { takeTokenFromAddress } from '@/helpers/address'
import { type ResetResult, resetPassword } from '@/services/auth/session'

export function ResetPasswordRoute() {
  const [token] = useState(takeTokenFromAddress)

  return (
    <ResetPasswordPage
      hasToken={token !== ''}
      onSubmit={({ password }) => resetPassword(token, password)}
      signIn={
        <Link to="/sign-in" className={buttonVariants({ size: 'lg', className: 'w-full' })}>
          Sign in
        </Link>
      }
      requestLink={
        <Link to="/forgot-password" className={AUTH_LINK}>
          Ask for a new link
        </Link>
      }
    />
  )
}

export function ResetPasswordPage({
  hasToken,
  onSubmit,
  signIn,
  requestLink,
}: {
  hasToken: boolean
  onSubmit: (values: ResetPasswordValues) => Promise<ResetResult>
  signIn?: ReactNode
  requestLink?: ReactNode
}) {
  const [changed, setChanged] = useState(false)
  const [linkRefused, setLinkRefused] = useState(false)
  const { register, errors, isSubmitting, error, submit } = useFormSubmission(resetPasswordSchema, async (values) => {
    const result = await onSubmit(values)
    setLinkRefused(Boolean(result.linkRefused))
    if (!result.error) setChanged(true)
    return { error: result.error }
  })

  if (!hasToken) {
    return (
      <AuthCard
        title="This reset link doesn't work"
        description="It's missing part of its address. Open the link from the email again, or ask for a new one."
        footer={requestLink && <p>{requestLink}</p>}
      />
    )
  }

  if (changed) {
    return (
      <AuthCard title="Password updated" description="Sign in with your new password. Other devices have been signed out.">
        {signIn}
      </AuthCard>
    )
  }

  return (
    <AuthCard
      title="Choose a new password"
      description="Other devices signed in to your account will be signed out."
      error={error}
      footer={linkRefused && requestLink && <p>{requestLink}</p>}
    >
      <form onSubmit={submit} noValidate className="flex flex-col gap-4">
        <TextField
          id="password"
          label="New password"
          type="password"
          autoComplete="new-password"
          description={NEW_PASSWORD_HINT}
          registration={register('password')}
          error={errors.password}
        />
        <Button type="submit" size="lg" disabled={isSubmitting}>
          {isSubmitting ? 'Saving…' : 'Update password'}
        </Button>
      </form>
    </AuthCard>
  )
}
