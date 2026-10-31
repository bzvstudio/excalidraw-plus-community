import { INVITE_COOKIE_MAX_AGE_SECONDS, inviteCookieName } from '@repo/api/auth.const'

function write(value: string, maxAgeSeconds: number): void {
  const secure = window.location.protocol === 'https:'
  document.cookie = `${inviteCookieName(secure)}=${value}; Path=/; Max-Age=${maxAgeSeconds}; SameSite=Lax${secure ? '; Secure' : ''}`
}

export function carryInviteThroughProvider(token: string): void {
  write(encodeURIComponent(token), INVITE_COOKIE_MAX_AGE_SECONDS)
}

export function dropCarriedInvite(): void {
  write('', 0)
}
