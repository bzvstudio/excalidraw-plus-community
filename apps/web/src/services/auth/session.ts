import { useQuery } from '@tanstack/react-query'
import type { SignInOption } from '@repo/api'
import { INVITE_TOKEN_HEADER, SETUP_CODE_CHECK_PATH, SETUP_CODE_HEADER, SIGN_IN_PATH, SIGN_UP_REFUSALS } from '@repo/api/auth.const'
import { ROUTE_GUARD_FRESH_MS } from '@/constants/routes'
import { toAccount, type SetupValues, type SignInValues, type SignUpValues } from '@/helpers/auth-forms'
import { queryClient, trpc } from '@/trpc'
import type { Principal } from '@/types/api'
import type { SubmitResult } from '@/types/forms'
import { authClient } from './auth-client'
import { carryInviteThroughProvider } from './invite-cookie'

const sessionQuery = trpc.session.get.queryOptions(undefined, { staleTime: ROUTE_GUARD_FRESH_MS })

export function loadSession(): Promise<Principal | null> {
  return queryClient.fetchQuery(sessionQuery)
}

export function useSignedIn(): boolean | undefined {
  return useQuery({ ...sessionQuery, select: (principal) => principal !== null }).data
}

type AuthError = { message?: string; code?: string } | null

function failure(error: NonNullable<AuthError>): SubmitResult {
  return { error: error.message ?? 'Something went wrong. Try again.' }
}

async function settle(request: Promise<{ error: AuthError }>): Promise<SubmitResult> {
  const { error } = await request
  if (error) return failure(error)
  await queryClient.invalidateQueries()
  return {}
}

export function signIn(values: SignInValues): Promise<SubmitResult> {
  return settle(authClient.signIn.email(values))
}

export function signUp(values: SignUpValues, inviteToken?: string): Promise<SubmitResult> {
  return settle(
    authClient.signUp.email(toAccount(values), inviteToken ? { headers: { [INVITE_TOKEN_HEADER]: inviteToken } } : undefined),
  )
}

export async function checkSetupCode(setupCode: string): Promise<SubmitResult> {
  const { data, error } = await authClient.$fetch<{ valid: boolean }>(SETUP_CODE_CHECK_PATH, {
    method: 'POST',
    body: {},
    headers: { [SETUP_CODE_HEADER]: setupCode },
  })
  if (error?.status === 429) return { error: 'Too many attempts. Wait a minute and try again.' }
  if (error) return failure(error)
  return data.valid ? {} : { error: "That code doesn't match. Check you copied the most recent one from the log." }
}

export type ClaimResult = SubmitResult & { codeRefused?: boolean }

export async function claimInstance({ setupCode, ...account }: SetupValues): Promise<ClaimResult> {
  const { error } = await authClient.signUp.email(toAccount(account), { headers: { [SETUP_CODE_HEADER]: setupCode } })
  if (error?.message === SIGN_UP_REFUSALS.setup_required) {
    return { error: 'The server restarted, so that code no longer works. Get the new one from the log.', codeRefused: true }
  }
  if (error) return failure(error)
  await queryClient.invalidateQueries()
  return {}
}

export async function requestPasswordReset(email: string): Promise<SubmitResult> {
  const { error } = await authClient.requestPasswordReset({ email })
  return error ? { error: error.message ?? 'Something went wrong. Try again.' } : {}
}

export type ResetResult = SubmitResult & { linkRefused?: boolean }

export async function resetPassword(token: string, newPassword: string): Promise<ResetResult> {
  const { error } = await authClient.resetPassword({ token, newPassword })
  if (error?.code === 'INVALID_TOKEN') return { error: 'This link has expired or has been used already.', linkRefused: true }
  if (error) return failure(error)
  await queryClient.invalidateQueries()
  return {}
}

export async function continueWith(
  option: SignInOption,
  returnTo: { path: string; inviteToken?: string },
): Promise<SubmitResult> {
  if (returnTo.inviteToken) carryInviteThroughProvider(returnTo.inviteToken)
  const urls = {
    callbackURL: `${window.location.origin}${returnTo.path}`,
    errorCallbackURL: `${window.location.origin}${SIGN_IN_PATH}`,
  }
  const { error } = await authClient.signIn.social({ provider: option.id, ...urls })
  return error ? { error: error.message ?? 'Could not reach that sign-in provider. Try again.' } : {}
}

export async function signOut(): Promise<SubmitResult> {
  const { error } = await authClient.signOut()
  if (error) return failure(error)
  queryClient.setQueryData(sessionQuery.queryKey, null)
  const session = queryClient.getQueryCache().find({ queryKey: sessionQuery.queryKey, exact: true })
  await queryClient.invalidateQueries({ predicate: (query) => query !== session, refetchType: 'none' })
  return {}
}
