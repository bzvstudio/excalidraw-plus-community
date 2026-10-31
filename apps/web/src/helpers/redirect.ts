import { HOME_PATH } from '@/constants/routes'

export function safeRedirect(target: unknown, origin: string): string {
  if (typeof target !== 'string' || !target.startsWith('/')) return HOME_PATH
  const url = new URL(target, origin)
  if (url.origin !== origin) return HOME_PATH
  return `${url.pathname}${url.search}${url.hash}`
}
