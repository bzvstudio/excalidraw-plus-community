import { EyeIcon } from '@animateicons/react/lucide/eye-icon'
import { EyeOffIcon } from '@animateicons/react/lucide/eye-off-icon'
import { type ReactNode, useState } from 'react'
import type { FieldError as FormFieldError, UseFormRegisterReturn } from 'react-hook-form'
import { AnimatedIcon } from '@/components/ui/animated-icon'
import { Button } from '@/components/ui/button'
import { Field, FieldDescription, FieldError, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'

export function TextField({
  id,
  label,
  hideLabel = false,
  type = 'text',
  revealable = false,
  autoComplete,
  secret = false,
  literal = false,
  autoFocus = false,
  placeholder,
  aside,
  prefix,
  description,
  registration,
  error,
}: {
  id: string
  label: string
  hideLabel?: boolean
  type?: 'text' | 'email' | 'password'
  revealable?: boolean
  autoComplete?: string
  secret?: boolean
  literal?: boolean
  autoFocus?: boolean
  placeholder?: string
  aside?: ReactNode
  prefix?: string
  description?: ReactNode
  registration: UseFormRegisterReturn
  error?: FormFieldError
}) {
  const [revealed, setRevealed] = useState(false)
  const descriptionId = description && !error ? `${id}-description` : undefined
  const prefixId = prefix ? `${id}-prefix` : undefined
  const describedBy = [prefixId, descriptionId].filter(Boolean).join(' ') || undefined
  const verbatim = literal || type === 'email' || revealable
  const input = (
    <Input
      className={prefix ? 'h-full rounded-none border-0 bg-transparent pl-0 focus-visible:ring-0 aria-invalid:ring-0 dark:bg-transparent' : cn('h-10', revealable && 'pr-10')}
      id={id}
      type={revealed ? 'text' : type}
      autoComplete={autoComplete}
      autoFocus={autoFocus}
      placeholder={placeholder}
      aria-invalid={Boolean(error)}
      aria-describedby={describedBy}
      {...(verbatim && { spellCheck: false, autoCapitalize: 'none', autoCorrect: 'off' })}
      {...(secret && { 'data-1p-ignore': true, 'data-lpignore': 'true' })}
      {...registration}
    />
  )

  return (
    <Field data-invalid={Boolean(error)}>
      {hideLabel ? (
        <label htmlFor={id} className="sr-only">
          {label}
        </label>
      ) : (
        <div className="flex items-baseline justify-between gap-3">
          <FieldLabel htmlFor={id}>{label}</FieldLabel>
          {aside}
        </div>
      )}
      {prefix ? (
        <div className="flex h-10 items-center rounded-lg border border-input bg-background text-sm transition-[box-shadow,border-color] duration-150 focus-within:border-[color-mix(in_oklch,var(--brand)_60%,transparent)] focus-within:ring-3 focus-within:ring-ring has-aria-invalid:border-destructive has-aria-invalid:ring-3 has-aria-invalid:ring-destructive/20 motion-reduce:transition-none dark:bg-input/30">
          <span id={prefixId} className="max-w-[60%] shrink-0 truncate pl-3 text-muted-foreground select-none">
            {prefix}
          </span>
          {input}
        </div>
      ) : revealable ? (
        <div className="relative">
          {input}
          <Button
            type="button"
            variant="ghost"
            size="icon-xs"
            aria-label={revealed ? 'Hide password' : 'Show password'}
            className="absolute top-1/2 right-1.5 -translate-y-1/2 text-muted-foreground"
            onMouseDown={(event) => event.preventDefault()}
            onClick={() => setRevealed(!revealed)}
          >
            <AnimatedIcon icon={revealed ? EyeOffIcon : EyeIcon} />
          </Button>
        </div>
      ) : (
        input
      )}
      {descriptionId && <FieldDescription id={descriptionId} className="-mt-1 text-xs">{description}</FieldDescription>}
      <FieldError errors={[error]} />
    </Field>
  )
}
