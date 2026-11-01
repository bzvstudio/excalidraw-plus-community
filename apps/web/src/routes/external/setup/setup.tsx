import { useNavigate } from '@tanstack/react-router'
import { InfoIcon } from 'lucide-react'
import { useState } from 'react'
import type { DefaultValues } from 'react-hook-form'
import { AuthCard } from '@/components/auth/auth-card'
import { TextField } from '@/components/auth/text-field'
import { Button } from '@/components/ui/button'
import { Popover, PopoverContent, PopoverTitle, PopoverTrigger } from '@/components/ui/popover'
import { useFormSubmission } from '@/hooks/use-form-submission'
import { NEW_PASSWORD_HINT, setupCodeSchema, signUpSchema, type SetupCodeValues, type SignUpValues } from '@/helpers/auth-forms'
import { HOME_PATH } from '@/constants/routes'
import { checkSetupCode, claimInstance } from '@/services/auth/session'

type AccountDraft = DefaultValues<SignUpValues>

const HELP_HOVER_DELAY_MS = 150

const CODE_SOURCES = [
  { host: 'Railway', where: "Your app's Deployments tab, then the latest deployment's log" },
  { host: 'Docker', where: 'Run docker logs <container>' },
  { host: 'Local', where: 'The terminal running make dev' },
]

export function SetupRoute() {
  const [setupCode, setSetupCode] = useState('')
  const [accepted, setAccepted] = useState(false)
  const [account, setAccount] = useState<AccountDraft>()
  const [notice, setNotice] = useState<string>()

  if (!accepted) {
    return (
      <SetupCodeScreen
        setupCode={setupCode}
        notice={notice}
        onAccepted={(code) => {
          setSetupCode(code)
          setNotice(undefined)
          setAccepted(true)
        }}
      />
    )
  }

  return (
    <AccountScreen
      setupCode={setupCode}
      account={account}
      onCodeRefused={(draft, reason) => {
        setAccount(draft)
        setNotice(reason)
        setSetupCode('')
        setAccepted(false)
      }}
    />
  )
}

function SetupCodeScreen({
  setupCode,
  notice,
  onAccepted,
}: {
  setupCode: string
  notice?: string
  onAccepted: (setupCode: string) => void
}) {
  const check = async (values: SetupCodeValues) => {
    const result = await checkSetupCode(values.setupCode)
    if (!result.error) onAccepted(values.setupCode)
    return result
  }
  const { register, errors, isSubmitting, error, submit } = useFormSubmission(setupCodeSchema, check, { setupCode })

  return (
    <AuthCard title="Enter setup code" titleAside={<SetupCodeHelp />} align="start" error={error ?? notice}>
      <form onSubmit={submit} noValidate className="flex flex-col gap-4">
        <TextField
          id="setupCode"
          label="Setup code"
          hideLabel
          autoComplete="off"
          autoFocus
          literal
          placeholder="XXXX-XXXX-XXXX"
          registration={register('setupCode')}
          error={errors.setupCode}
        />
        <Button type="submit" size="lg" disabled={isSubmitting}>
          {isSubmitting ? 'Checking…' : 'Continue'}
        </Button>
      </form>
    </AuthCard>
  )
}

function SetupCodeHelp() {
  return (
    <Popover>
      <PopoverTrigger
        openOnHover
        delay={HELP_HOVER_DELAY_MS}
        aria-label="Where to find your setup code"
        render={
          <Button type="button" variant="ghost" size="icon-xs" className="text-muted-foreground">
            <InfoIcon aria-hidden />
          </Button>
        }
      />
      <PopoverContent side="top" className="flex w-80 flex-col gap-2 text-xs">
        <PopoverTitle>Where to find your setup code</PopoverTitle>
        <div className="text-muted-foreground">The server prints it to its log when it starts. Look for this line:</div>
        <code className="block rounded-md bg-muted p-2 font-mono text-foreground">
          This instance has no administrator yet. Open …/setup and enter the setup code ABCD-EFGH-JKMN to claim it.
        </code>
        <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1">
          {CODE_SOURCES.map(({ host, where }) => (
            <div key={host} className="contents">
              <dt className="font-medium">{host}</dt>
              <dd className="text-muted-foreground">{where}</dd>
            </div>
          ))}
        </dl>
        <div className="text-muted-foreground">Restarting the server prints a new code, so use the most recent one.</div>
      </PopoverContent>
    </Popover>
  )
}

function AccountScreen({
  setupCode,
  account,
  onCodeRefused,
}: {
  setupCode: string
  account?: AccountDraft
  onCodeRefused: (draft: AccountDraft, reason?: string) => void
}) {
  const navigate = useNavigate()

  const claim = async (values: SignUpValues) => {
    const result = await claimInstance({ ...values, setupCode })
    if (result.codeRefused) {
      onCodeRefused(values, result.error)
      return {}
    }
    if (!result.error) await navigate({ href: HOME_PATH, replace: true })
    return result
  }
  const { register, errors, isSubmitting, error, submit } = useFormSubmission(signUpSchema, claim, account)

  return (
    <AuthCard title="Create account" align="start" error={error}>
      <form onSubmit={submit} noValidate className="flex flex-col gap-4">
        <TextField
          id="firstName"
          label="First name"
          autoComplete="given-name"
          autoFocus
          registration={register('firstName')}
          error={errors.firstName}
        />
        <TextField id="lastName" label="Last name" autoComplete="family-name" registration={register('lastName')} error={errors.lastName} />
        <TextField id="email" label="Email" type="email" autoComplete="email" registration={register('email')} error={errors.email} />
        <TextField
          id="password"
          label="Password"
          type="password"
          revealable
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
