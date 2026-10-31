import type { FieldError, UseFormRegisterReturn } from 'react-hook-form'
import { TextField } from '@/components/auth/text-field'

type NamePart = { registration: UseFormRegisterReturn; error?: FieldError }

export function NameFields({ firstName, lastName }: { firstName: NamePart; lastName: NamePart }) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      <TextField id="firstName" label="First name" autoComplete="given-name" {...firstName} />
      <TextField id="lastName" label="Last name" autoComplete="family-name" {...lastName} />
    </div>
  )
}
