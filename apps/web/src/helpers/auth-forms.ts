import { collapseName, MIN_PASSWORD_LENGTH, USER_NAME_MAX_LENGTH } from '@repo/api/auth.const'
import { guestNameSchema } from '@repo/api/sharing.const'
import { z } from 'zod'

const email = z.email('Enter a valid email address')

const newPassword = z
  .string()
  .min(MIN_PASSWORD_LENGTH, `Use at least ${MIN_PASSWORD_LENGTH} characters`)

export const NEW_PASSWORD_HINT = `At least ${MIN_PASSWORD_LENGTH} characters.`

const NAME_PART_MAX_LENGTH = Math.floor((USER_NAME_MAX_LENGTH - 1) / 2)

const namePart = z
  .string()
  .max(NAME_PART_MAX_LENGTH, `Keep this under ${NAME_PART_MAX_LENGTH} characters`)

const firstName = z.string().transform(collapseName).pipe(namePart.min(1, 'Enter your first name'))

const lastName = z.string().transform(collapseName).pipe(namePart)

export const signInSchema = z.object({
  email,
  password: z.string().min(1, 'Enter your password'),
})

export const signUpSchema = z.object({ firstName, lastName, email, password: newPassword })

export const setupCodeSchema = z.object({
  setupCode: z.string().trim().min(1, 'Enter the setup code from the server log'),
})

export type SignInValues = z.infer<typeof signInSchema>
export type SignUpValues = z.infer<typeof signUpSchema>
export type SetupCodeValues = z.infer<typeof setupCodeSchema>
export type SetupValues = SignUpValues & SetupCodeValues

export function toAccount({ firstName, lastName, ...rest }: SignUpValues) {
  return { ...rest, name: [firstName, lastName].filter(Boolean).join(' ') }
}

export const forgotPasswordSchema = z.object({ email })

export const guestNameFormSchema = z.object({ name: guestNameSchema })

export const resetPasswordSchema = z.object({ password: newPassword })

export type ForgotPasswordValues = z.infer<typeof forgotPasswordSchema>
export type GuestNameValues = z.infer<typeof guestNameFormSchema>
export type ResetPasswordValues = z.infer<typeof resetPasswordSchema>
