import { Link, useNavigate, useSearch } from '@tanstack/react-router'
import { type ReactNode, useEffect } from 'react'
import { AUTH_LINK, AuthCard } from '@/components/auth/auth-card'
import { ProviderButtons } from '@/components/auth/provider-buttons'
import { TextField } from '@/components/auth/text-field'
import { Button } from '@/components/ui/button'
import { useFormSubmission } from '@/hooks/use-form-submission'
import { signInSchema, type SignInValues } from '@/helpers/auth-forms'
import { providerErrorMessage } from '@/helpers/provider-errors'
import { safeRedirect } from '@/helpers/redirect'
import type { SubmitResult } from '@/types/forms'
import { dropCarriedInvite } from '@/services/auth/invite-cookie'
import { continueWith, signIn } from '@/services/auth/session'
import { useRuntimeConfig } from '@/services/config/config'

export function SignInRoute() {
  const navigate = useNavigate()
  const { redirect, error } = useSearch({ strict: false })
  useEffect(() => {
    if (error) dropCarriedInvite()
  }, [error])
  const { productName, signUpMode, emailEnabled, signInOptions } = useRuntimeConfig()

  const submit = async (values: SignInValues) => {
    const result = await signIn(values)
    if (!result.error) await navigate({ href: safeRedirect(redirect, window.location.origin), replace: true })
    return result
  }

  return (
    <SignInPage
      productName={productName}
      onSubmit={submit}
      providerError={providerErrorMessage(error)}
      providers={
        <ProviderButtons
          options={signInOptions}
          onChoose={(option) => continueWith(option, { path: safeRedirect(redirect, window.location.origin) })}
        />
      }
      forgotPassword={
        emailEnabled && (
          <Link to="/forgot-password" className={`${AUTH_LINK} text-xs`}>
            Forgot password?
          </Link>
        )
      }
      footer={
        signUpMode === 'invite' ? (
          <p>New here? Ask an admin for an invite link.</p>
        ) : (
          <p>
            New here?{' '}
            <Link to="/sign-up" className={AUTH_LINK}>
              Create an account
            </Link>
          </p>
        )
      }
    />
  )
}

export function SignInPage({
  productName,
  onSubmit,
  footer,
  providers,
  providerError,
  forgotPassword,
}: {
  productName: string
  onSubmit: (values: SignInValues) => Promise<SubmitResult>
  footer?: ReactNode
  providers?: ReactNode
  providerError?: string
  forgotPassword?: ReactNode
}) {
  const { register, errors, isSubmitting, error, submit } = useFormSubmission(signInSchema, onSubmit)

  return (
    <AuthCard
      title={`Sign in to ${productName}`}
      description="Pick up where you left off."
      error={error ?? providerError}
      footer={footer}
    >
      {providers}
      <form onSubmit={submit} noValidate className="flex flex-col gap-4">
        <TextField id="email" label="Email" type="email" autoComplete="email" registration={register('email')} error={errors.email} />
        <TextField
          id="password"
          label="Password"
          type="password"
          autoComplete="current-password"
          aside={forgotPassword}
          registration={register('password')}
          error={errors.password}
        />
        <Button type="submit" size="lg" disabled={isSubmitting}>
          {isSubmitting ? 'Signing in…' : 'Sign in'}
        </Button>
      </form>
    </AuthCard>
  )
}
