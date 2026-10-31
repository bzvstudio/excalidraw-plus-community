import { useQuery } from '@tanstack/react-query'
import { useNavigate } from '@tanstack/react-router'
import { sceneLink, sharedSceneLink } from '@/helpers/places'
import { type ReactNode, useCallback, useEffect, useState } from 'react'
import { LinkIcon, UnlinkIcon } from 'lucide-react'
import { AuthCard } from '@/components/auth/auth-card'
import { TextField } from '@/components/auth/text-field'
import { WayHome } from '@/components/auth/way-home'
import { Button } from '@/components/ui/button'
import { takeTokenFromAddress } from '@/helpers/address'
import { guestNameFormSchema } from '@/helpers/auth-forms'
import { asSentence, attempt } from '@/helpers/results'
import { useFormSubmission } from '@/hooks/use-form-submission'
import { openShareLink } from '@/services/shares/shares'
import { trpc } from '@/trpc'
import type { SubmitResult } from '@/types/forms'

export function LinkRoute() {
  const navigate = useNavigate()
  const [token] = useState(takeTokenFromAddress)
  const session = useQuery(trpc.session.get.queryOptions())
  const [problem, setProblem] = useState<string>()

  const open = useCallback(
    (name: string | undefined): Promise<SubmitResult> =>
      attempt(async () => {
        const opened = await openShareLink(token, name)
        if (opened.membership) {
          const { workspaceSlug, sceneId } = opened.membership
          await navigate({ ...sceneLink(workspaceSlug, sceneId), replace: true })
        } else {
          await navigate({ ...sharedSceneLink(opened.linkId), replace: true })
        }
      }),
    [token, navigate],
  )

  const signedIn = Boolean(session.data)
  useEffect(() => {
    if (token && signedIn) void open(undefined).then((result) => setProblem(result.error))
  }, [token, signedIn, open])

  if (!token) return <LinkProblem message="Part of this link went missing on the way. Ask the person who sent it to copy it again." action={<WayHome />} />
  if (problem) return <LinkProblem message={problem} action={<WayHome />} />
  if (session.isPending || signedIn) return null
  return <GuestNamePage onSubmit={({ name }) => open(name)} />
}

export function LinkProblem({ message, action }: { message: string; action?: ReactNode }) {
  return (
    <AuthCard icon={UnlinkIcon} title="We can't open this scene" description={asSentence(message)}>
      {action}
    </AuthCard>
  )
}

export function GuestNamePage({ onSubmit }: { onSubmit: (values: { name: string }) => Promise<SubmitResult> }) {
  const { register, errors, isSubmitting, error, submit } = useFormSubmission(guestNameFormSchema, onSubmit)

  return (
    <AuthCard
      icon={LinkIcon}
      title="A scene was shared with you"
      description="Add your name so everyone in the scene can see who's joined."
      error={error}
      footer="No account needed. This browser will remember your name."
    >
      <form onSubmit={submit} noValidate className="flex flex-col gap-4">
        <TextField
          id="name"
          label="Your name"
          autoComplete="name"
          description="Shown beside your cursor and on comments you leave."
          registration={register('name')}
          error={errors.name}
        />
        <Button type="submit" size="lg" disabled={isSubmitting}>
          {isSubmitting ? 'Opening the scene…' : 'Continue to the scene'}
        </Button>
      </form>
    </AuthCard>
  )
}
