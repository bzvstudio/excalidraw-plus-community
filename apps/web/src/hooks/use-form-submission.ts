import { zodResolver } from '@hookform/resolvers/zod'
import { useState } from 'react'
import { type DefaultValues, type FieldValues, useForm } from 'react-hook-form'
import type { z } from 'zod'
import type { SubmitResult } from '@/types/forms'

export function useFormSubmission<Values extends FieldValues>(
  schema: z.ZodType<Values, Values>,
  onSubmit: (values: Values) => Promise<SubmitResult>,
  defaultValues?: DefaultValues<Values>,
) {
  const [error, setError] = useState<string>()
  const form = useForm<Values>({ resolver: zodResolver(schema), defaultValues })

  const submit = form.handleSubmit(async (values) => setError((await onSubmit(values)).error))

  return {
    register: form.register,
    watch: form.watch,
    control: form.control,
    setValue: form.setValue,
    errors: form.formState.errors,
    isSubmitting: form.formState.isSubmitting,
    error,
    submit,
  }
}
