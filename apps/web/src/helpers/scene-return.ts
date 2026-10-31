import { ACCOUNT_PATH } from '@/constants/routes'

export type ReturnPlace = { href: string; label: string }

type NamedCollection = { id: string; name: string }

const KEY = 'scene-return'

function keyOf(workspaceId: string): string {
  return `${KEY}:${workspaceId}`
}

export function rememberReturn(workspaceId: string, href: string): void {
  try {
    sessionStorage.setItem(keyOf(workspaceId), href)
  } catch {
    return
  }
}

export function rememberedReturn(workspaceId: string): string | undefined {
  try {
    return sessionStorage.getItem(keyOf(workspaceId)) ?? undefined
  } catch {
    return undefined
  }
}

export function returnLabel(href: string, slug: string, collections: readonly NamedCollection[]): string | undefined {
  const pathname = href.split(/[?#]/)[0]!.replace(/\/+$/, '')
  if (pathname === ACCOUNT_PATH || pathname.startsWith(`${ACCOUNT_PATH}/`)) return 'Account'
  const base = `/${slug}`
  if (pathname !== base && !pathname.startsWith(`${base}/`)) return undefined
  const rest = pathname.slice(base.length)
  if (rest === '') return 'Home'
  if (rest === '/drafts') return 'Drafts'
  if (rest === '/activity') return 'Activity'
  if (rest === '/settings' || rest.startsWith('/settings/')) return 'Settings'
  const collection = /^\/collections\/([^/]+)$/.exec(rest)?.[1]
  return collection === undefined ? undefined : collections.find(({ id }) => id === collection)?.name
}

export function returnPlace({
  remembered,
  slug,
  collections,
  sceneCollectionId,
}: {
  remembered: string | undefined
  slug: string
  collections: readonly NamedCollection[]
  sceneCollectionId: string | null
}): ReturnPlace {
  const label = remembered === undefined ? undefined : returnLabel(remembered, slug, collections)
  if (remembered !== undefined && label !== undefined) return { href: remembered, label }
  if (sceneCollectionId === null) return { href: `/${slug}/drafts`, label: 'Drafts' }
  const collection = collections.find(({ id }) => id === sceneCollectionId)
  return collection ? { href: `/${slug}/collections/${collection.id}`, label: collection.name } : { href: `/${slug}`, label: 'Home' }
}
