import type { SignUpMode } from '@repo/api'
import { Link, useNavigate } from '@tanstack/react-router'
import type { ReactNode } from 'react'
import { AUTH_LINK, AuthCard } from '@/components/auth/auth-card'
import { ProviderButtons } from '@/components/auth/provider-buttons'
import { NameFields } from '@/components/auth/name-fields'
import { TextField } from '@/components/auth/text-field'
import { Button } from '@/components/ui/button'
import { useFormSubmission } from '@/hooks/use-form-submission'
import { NEW_PASSWORD_HINT, signUpSchema, type SignUpValues } from '@/helpers/auth-forms'
import { HOME_PATH } from '@/constants/routes'
import type { SubmitResult } from '@/types/forms'
import { continueWith, signUp } from '@/services/auth/session'
import { useRuntimeConfig } from '@/services/config/config'

export function SignUpRoute() {
  const navigate = useNavigate()
  const { signUpMode, signInOptions } = useRuntimeConfig()

  const submit = async (values: SignUpValues) => {
    const result = await signUp(values)
    if (!result.error) await navigate({ href: HOME_PATH, replace: true })
    return result
  }

  return (
    <SignUpPage
      signUpMode={signUpMode}
      onSubmit={submit}
      providers={
        <ProviderButtons options={signInOptions} onChoose={(option) => continueWith(option, { path: HOME_PATH })} />
      }
      signInLink={
        <Link to="/sign-in" className={AUTH_LINK}>
          Sign in
        </Link>
      }
    />
  )
}

export function SignUpPage({
  signUpMode,
  onSubmit,
  signInLink,
  providers,
}: {
  signUpMode: SignUpMode
  onSubmit: (values: SignUpValues) => Promise<SubmitResult>
  signInLink: ReactNode
  providers?: ReactNode
}) {
  const { register, errors, isSubmitting, error, submit } = useFormSubmission(signUpSchema, onSubmit)

  const footer = <p>Already have an account? {signInLink}</p>

  if (signUpMode === 'invite') {
    return (
      <AuthCard
        title="Accounts are by invitation"
        description="Ask an admin of this server for an invite link. Opening it lets you create your account."
        footer={footer}
      />
    )
  }

  return (
    <AuthCard
      title="Create your account"
      description={signUpMode === 'domain' ? 'Use your work email address.' : 'Then you can create your first workspace.'}
      error={error}
      footer={footer}
    >
      {providers}
      <form onSubmit={submit} noValidate className="flex flex-col gap-4">
        <NameFields
          firstName={{ registration: register('firstName'), error: errors.firstName }}
          lastName={{ registration: register('lastName'), error: errors.lastName }}
        />
        <TextField id="email" label="Email" type="email" autoComplete="email" registration={register('email')} error={errors.email} />
        <TextField
          id="password"
          label="Password"
          type="password"
          autoComplete="new-password"
          description={NEW_PASSWORD_HINT}
          registration={register('password')}
          error={errors.password}
        />
        <Button type="submit" size="lg" disabled={isSubmitting}>
          {isSubmitting ? 'Creating your account…' : 'Create account'}
        </Button>
      </form>
    </AuthCard>
  )
}
