import { AUTH_BASE_PATH } from '@repo/api/auth.const'
import { createAuthClient } from 'better-auth/react'

export const authClient = createAuthClient({
  baseURL: window.location.origin,
  basePath: AUTH_BASE_PATH,
})
