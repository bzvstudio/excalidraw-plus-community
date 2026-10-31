import { useNavigate } from '@tanstack/react-router'
import { AuthCard } from '@/components/auth/auth-card'
import { NameFields } from '@/components/auth/name-fields'
import { TextField } from '@/components/auth/text-field'
import { Button } from '@/components/ui/button'
import { useFormSubmission } from '@/hooks/use-form-submission'
import { NEW_PASSWORD_HINT, setupSchema, type SetupValues } from '@/helpers/auth-forms'
import { HOME_PATH } from '@/constants/routes'
import type { SubmitResult } from '@/types/forms'
import { claimInstance } from '@/services/auth/session'
import { useRuntimeConfig } from '@/services/config/config'

export function SetupRoute() {
  const navigate = useNavigate()
  const { productName } = useRuntimeConfig()

  const submit = async (values: SetupValues) => {
    const result = await claimInstance(values)
    if (!result.error) await navigate({ href: HOME_PATH, replace: true })
    return result
  }

  return <SetupPage productName={productName} onSubmit={submit} />
}

export function SetupPage({
  productName,
  onSubmit,
}: {
  productName: string
  onSubmit: (values: SetupValues) => Promise<SubmitResult>
}) {
  const { register, errors, isSubmitting, error, submit } = useFormSubmission(setupSchema, onSubmit)

  return (
    <AuthCard
      title={`Set up ${productName}`}
      description="This server has no admin yet. Create the first account to claim it."
      error={error}
    >
      <form onSubmit={submit} noValidate className="flex flex-col gap-4">
        <TextField
          id="setupCode"
          label="Setup code"
          autoComplete="off"
          literal
          description="Printed in the server's log when it starts. A restart prints a new one."
          registration={register('setupCode')}
          error={errors.setupCode}
        />
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
          {isSubmitting ? 'Claiming…' : 'Claim this server'}
        </Button>
      </form>
    </AuthCard>
  )
}
