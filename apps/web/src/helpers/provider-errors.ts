import type { SignUpRefusalCode } from '@repo/api'
import { SIGN_UP_REFUSALS } from '@repo/api/auth.const'

type ProviderErrorCode = SignUpRefusalCode | 'account_not_linked' | 'access_denied'

const PROVIDER_ERRORS: Record<ProviderErrorCode, string> = {
  ...SIGN_UP_REFUSALS,
  account_not_linked: 'This email address already has an account here. Sign in with its password instead.',
  access_denied: 'You cancelled signing in. Choose a way to sign in when you are ready.',
}

function isProviderErrorCode(code: string): code is ProviderErrorCode {
  return Object.hasOwn(PROVIDER_ERRORS, code)
}

export function providerErrorMessage(code: string | undefined): string | undefined {
  if (!code) return undefined
  return isProviderErrorCode(code)
    ? PROVIDER_ERRORS[code]
    : "That sign-in didn't go through. Try again, or choose another way to sign in."
}
