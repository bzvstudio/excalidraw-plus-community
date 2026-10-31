import type { InvitePreview } from '@repo/api'
import { useQuery } from '@tanstack/react-query'
import { Link, useNavigate } from '@tanstack/react-router'
import { type ReactNode, useState } from 'react'
import { AUTH_LINK, AuthCard } from '@/components/auth/auth-card'
import { SignedInAs } from '@/components/auth/signed-in-as'
import { ProviderButtons } from '@/components/auth/provider-buttons'
import { NameFields } from '@/components/auth/name-fields'
import { TextField } from '@/components/auth/text-field'
import { Button } from '@/components/ui/button'
import { ROLE_LABELS } from '@/constants/roles'
import { HOME_PATH } from '@/constants/routes'
import { NEW_PASSWORD_HINT, signUpSchema, type SignUpValues } from '@/helpers/auth-forms'
import { useFormSubmission } from '@/hooks/use-form-submission'
import { continueWith, signOut, signUp } from '@/services/auth/session'
import { useRuntimeConfig } from '@/services/config/config'
import { takeTokenFromAddress } from '@/helpers/address'
import { attempt, messageOf } from '@/helpers/results'
import {
  acceptInvite,
  INVITE_ROUTE,
  previewInvite,
  recallPendingInvite,
  rememberPendingInvite,
} from '@/services/workspaces/workspaces'
import { trpc } from '@/trpc'
import type { SubmitResult } from '@/types/forms'
import { workspaceLink } from '@/helpers/places'

export function InviteRoute() {
  const navigate = useNavigate()
  const [token] = useState(() => {
    const fromLink = takeTokenFromAddress()
    if (fromLink) rememberPendingInvite(fromLink)
    return fromLink || recallPendingInvite()
  })
  const preview = useQuery({
    queryKey: ['invite-preview', token],
    queryFn: () => previewInvite(token),
    enabled: token !== '',
    retry: false,
  })
  const session = useQuery(trpc.session.get.queryOptions())
  const { signInOptions } = useRuntimeConfig()

  const join = async (): Promise<SubmitResult> =>
    attempt(async () => {
      const workspace = await acceptInvite(token)
      await navigate({ ...workspaceLink(workspace.slug), replace: true })
    })

  const signUpAndJoin = async (values: SignUpValues): Promise<SubmitResult> => {
    const signedUp = await signUp(values, token)
    return signedUp.error ? signedUp : join()
  }

  if (token === '') return <InviteProblem message="It's missing part of its address. Ask for the link to be sent again." homeLink={<HomeLink />} />
  if (preview.isError) return <InviteProblem message={messageOf(preview.error)} homeLink={<HomeLink />} />
  if (!preview.data || session.isPending) return null

  return (
    <InvitePage
      preview={preview.data}
      signedInAs={session.data?.email}
      onJoin={join}
      onSignOut={signOut}
      onSignUp={signUpAndJoin}
      providers={
        <ProviderButtons
          options={signInOptions}
          onChoose={(option) => continueWith(option, { path: HOME_PATH, inviteToken: token })}
        />
      }
      signInLink={
        <Link to="/sign-in" search={{ redirect: INVITE_ROUTE }} className={AUTH_LINK}>
          Sign in
        </Link>
      }
    />
  )
}

export function InviteProblem({ message, homeLink }: { message: string; homeLink?: ReactNode }) {
  return <AuthCard title="Can't use this invite" description={message} footer={homeLink && <p>{homeLink}</p>} />
}

function HomeLink() {
  const { productName } = useRuntimeConfig()
  return (
    <Link to="/" className={AUTH_LINK}>
      Go to {productName}
    </Link>
  )
}

export function InvitePage({
  preview,
  signedInAs,
  onJoin,
  onSignOut,
  onSignUp,
  signInLink,
  providers,
}: {
  preview: InvitePreview
  signedInAs?: string
  onJoin: () => Promise<SubmitResult>
  onSignOut: () => Promise<SubmitResult>
  onSignUp: (values: SignUpValues) => Promise<SubmitResult>
  signInLink: ReactNode
  providers?: ReactNode
}) {
  const title = `Join ${preview.workspaceName}`
  const description = `You're invited to join as a ${ROLE_LABELS[preview.role].toLowerCase()}.`

  return signedInAs ? (
    <JoinAsSignedIn title={title} description={description} email={signedInAs} onJoin={onJoin} onSignOut={onSignOut} />
  ) : (
    <JoinBySigningUp
      title={title}
      description={description}
      onSignUp={onSignUp}
      signInLink={signInLink}
      providers={providers}
    />
  )
}

function JoinAsSignedIn({
  title,
  description,
  email,
  onJoin,
  onSignOut,
}: {
  title: string
  description: string
  email: string
  onJoin: () => Promise<SubmitResult>
  onSignOut: () => Promise<SubmitResult>
}) {
  const [error, setError] = useState<string>()
  const [joining, setJoining] = useState(false)

  const join = async () => {
    setJoining(true)
    setError((await onJoin()).error)
    setJoining(false)
  }

  return (
    <AuthCard
      title={title}
      description={description}
      error={error}
      footer={<SignedInAs email={email} onSignOut={onSignOut} />}
    >
      <Button size="lg" onClick={join} disabled={joining}>
        {joining ? 'Joining…' : 'Accept invite'}
      </Button>
    </AuthCard>
  )
}

function JoinBySigningUp({
  title,
  description,
  onSignUp,
  signInLink,
  providers,
}: {
  title: string
  description: string
  onSignUp: (values: SignUpValues) => Promise<SubmitResult>
  signInLink: ReactNode
  providers?: ReactNode
}) {
  const { register, errors, isSubmitting, error, submit } = useFormSubmission(signUpSchema, onSignUp)

  return (
    <AuthCard
      title={title}
      description={`${description} Create your account to accept.`}
      error={error}
      footer={<p>Already have an account? {signInLink}</p>}
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
          {isSubmitting ? 'Joining…' : 'Create account and join'}
        </Button>
      </form>
    </AuthCard>
  )
}
