import { API_KEY_NAME_MAX_LENGTH, API_KEY_VALIDITY_DAYS } from '@repo/api/api-keys.const'
import { API_KEY_SCOPES } from '@repo/api/authorization.const'
import { z } from 'zod'
import type { NewApiKey } from '@/services/api-keys/api-keys'

const VALIDITY_LABELS: Record<(typeof API_KEY_VALIDITY_DAYS)[number], string> = {
  1: '1 day',
  7: '1 week',
  30: '1 month',
  90: '3 months',
  180: '6 months',
  365: '1 year',
}

export const API_KEY_VALIDITY_OPTIONS = [
  ...API_KEY_VALIDITY_DAYS.map((days) => ({ value: String(days), label: VALIDITY_LABELS[days] })),
  { value: 'never', label: 'No expiration' },
] as const

export const apiKeyFormSchema = z.object({
  name: z.string().trim().min(1, 'Name the key after what will use it').max(API_KEY_NAME_MAX_LENGTH, 'Use a shorter name'),
  scope: z.enum(API_KEY_SCOPES),
  validity: z.enum(API_KEY_VALIDITY_OPTIONS.map((option) => option.value) as [string, ...string[]]),
})

export type ApiKeyFormValues = z.infer<typeof apiKeyFormSchema>

export function validForDaysOf(validity: string): NewApiKey['validForDays'] {
  return API_KEY_VALIDITY_DAYS.find((days) => String(days) === validity) ?? null
}
