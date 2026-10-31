import { handleSchema, workspaceNameSchema } from '@repo/api/workspaces.const'
import { preferredSlug, typedHandle } from '@repo/api/workspaces.utils'
import { useQuery } from '@tanstack/react-query'
import { Link, useNavigate, useRouteContext } from '@tanstack/react-router'
import type { ChangeEvent, ReactNode } from 'react'
import { z } from 'zod'
import { AUTH_LINK, AuthCard } from '@/components/auth/auth-card'
import { SignedInAs } from '@/components/auth/signed-in-as'
import { TextField } from '@/components/auth/text-field'
import { Button } from '@/components/ui/button'
import { useFormSubmission } from '@/hooks/use-form-submission'
import { attempt } from '@/helpers/results'
import { signOut } from '@/services/auth/session'
import { createWorkspace } from '@/services/workspaces/workspaces'
import { trpc } from '@/trpc'
import type { SubmitResult } from '@/types/forms'
import { workspaceLink } from '@/helpers/places'

const onboardingSchema = z.object({ name: workspaceNameSchema, handle: handleSchema })

type OnboardingValues = z.infer<typeof onboardingSchema>

const HANDLE_CHOSEN = 'data-chosen'

export function OnboardingRoute() {
  const navigate = useNavigate()
  const { principal } = useRouteContext({ from: '/internal' })
  const hasWorkspace = (useQuery(trpc.workspaces.list.queryOptions()).data ?? []).length > 0

  const submit = ({ name, handle }: OnboardingValues): Promise<SubmitResult> =>
    attempt(async () => {
      const workspace = await createWorkspace(name, handle)
      await navigate({ ...workspaceLink(workspace.slug), replace: true })
    })

  const leave = async () => {
    const result = await signOut()
    if (!result.error) await navigate({ to: '/sign-in', replace: true })
    return result
  }

  return (
    <OnboardingPage
      host={window.location.host}
      onSubmit={submit}
      footer={
        hasWorkspace ? (
          <p>
            <Link to="/" className={AUTH_LINK}>
              Back to your workspace
            </Link>
          </p>
        ) : (
          <SignedInAs email={principal.email} onSignOut={leave} />
        )
      }
    />
  )
}

export function OnboardingPage({
  host,
  onSubmit,
  footer,
}: {
  host: string
  onSubmit: (values: OnboardingValues) => Promise<SubmitResult>
  footer?: ReactNode
}) {
  const { register, errors, isSubmitting, error, submit, setValue } = useFormSubmission(onboardingSchema, onSubmit)

  const name = register('name', {
    onChange: (event: ChangeEvent<HTMLInputElement>) => {
      const handleInput = event.target.form?.elements.namedItem('handle')
      if (handleInput instanceof HTMLInputElement && handleInput.hasAttribute(HANDLE_CHOSEN)) return
      const typed = event.target.value
      setValue('handle', typed.trim() ? preferredSlug(typed) : '', { shouldValidate: Boolean(errors.handle) })
    },
  })

  const handle = register('handle', {
    onChange: (event: ChangeEvent<HTMLInputElement>) => {
      const typed = typedHandle(event.target.value)
      event.target.toggleAttribute(HANDLE_CHOSEN, typed !== '')
      if (typed !== event.target.value) setValue('handle', typed)
    },
    onBlur: (event: { target: { value: string } }) => {
      const settled = event.target.value.replace(/-+$/, '')
      if (settled !== event.target.value) setValue('handle', settled, { shouldValidate: true })
    },
  })

  return (
    <AuthCard
      title="New workspace"
      description="A shared home for your team's scenes. You can invite people next."
      error={error}
      footer={footer}
    >
      <form onSubmit={submit} noValidate className="flex flex-col gap-4">
        <TextField id="name" label="Name" autoComplete="organization" registration={name} error={errors.name} />
        <TextField id="handle" label="Handle" prefix={`${host}/`} literal registration={handle} error={errors.handle} />
        <Button type="submit" size="lg" disabled={isSubmitting}>
          {isSubmitting ? 'Creating…' : 'Create workspace'}
        </Button>
      </form>
    </AuthCard>
  )
}
