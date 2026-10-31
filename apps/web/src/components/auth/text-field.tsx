import type { ReactNode } from 'react'
import type { FieldError as FormFieldError, UseFormRegisterReturn } from 'react-hook-form'
import { Field, FieldDescription, FieldError, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'

export function TextField({
  id,
  label,
  type = 'text',
  autoComplete,
  secret = false,
  literal = false,
  aside,
  prefix,
  description,
  registration,
  error,
}: {
  id: string
  label: string
  type?: 'text' | 'email' | 'password'
  autoComplete?: string
  secret?: boolean
  literal?: boolean
  aside?: ReactNode
  prefix?: string
  description?: ReactNode
  registration: UseFormRegisterReturn
  error?: FormFieldError
}) {
  const descriptionId = description && !error ? `${id}-description` : undefined
  const prefixId = prefix ? `${id}-prefix` : undefined
  const describedBy = [prefixId, descriptionId].filter(Boolean).join(' ') || undefined
  const verbatim = literal || type === 'email'
  const input = (
    <Input
      className={prefix ? 'h-full rounded-none border-0 bg-transparent pl-0 focus-visible:ring-0 aria-invalid:ring-0 dark:bg-transparent' : 'h-10'}
      id={id}
      type={type}
      autoComplete={autoComplete}
      aria-invalid={Boolean(error)}
      aria-describedby={describedBy}
      {...(verbatim && { spellCheck: false, autoCapitalize: 'none', autoCorrect: 'off' })}
      {...(secret && { 'data-1p-ignore': true, 'data-lpignore': 'true' })}
      {...registration}
    />
  )

  return (
    <Field data-invalid={Boolean(error)}>
      <div className="flex items-baseline justify-between gap-3">
        <FieldLabel htmlFor={id}>{label}</FieldLabel>
        {aside}
      </div>
      {prefix ? (
        <div className="flex h-10 items-center rounded-lg border border-input bg-background text-sm transition-[box-shadow,border-color] duration-150 focus-within:border-[color-mix(in_oklch,var(--brand)_60%,transparent)] focus-within:ring-3 focus-within:ring-ring has-aria-invalid:border-destructive has-aria-invalid:ring-3 has-aria-invalid:ring-destructive/20 motion-reduce:transition-none dark:bg-input/30">
          <span id={prefixId} className="max-w-[60%] shrink-0 truncate pl-3 text-muted-foreground select-none">
            {prefix}
          </span>
          {input}
        </div>
      ) : (
        input
      )}
      {descriptionId && <FieldDescription id={descriptionId} className="-mt-1 text-xs">{description}</FieldDescription>}
      <FieldError errors={[error]} />
    </Field>
  )
}
