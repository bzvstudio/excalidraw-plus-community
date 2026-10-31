import { DRAFTS } from '@repo/api/scenes.const'
import { CREATE_WORKSPACE_PATH, HOME_PATH, LEGACY_NEW_API_KEY_PAGE, LEGACY_SETTINGS_PAGES } from '@/constants/routes'
import { SETTINGS_ROUTES } from '@/constants/settings'

type Location = { pathname: string; searchStr: string; hash: string }

function settingsPath(slug: string, page: string[]): string {
  const name = page.join('/')
  if (name === LEGACY_NEW_API_KEY_PAGE) return `${SETTINGS_ROUTES['api-keys'].replace('$slug', slug)}/new`
  return SETTINGS_ROUTES[LEGACY_SETTINGS_PAGES.get(name) ?? 'general'].replace('$slug', slug)
}

function placePath(slug: string, place: string | null): string {
  if (!place) return `/${slug}`
  if (place === DRAFTS) return `/${slug}/drafts`
  return `/${slug}/collections/${encodeURIComponent(place)}`
}

function dropPlaceParam(searchStr: string): string {
  const search = new URLSearchParams(searchStr)
  search.delete('in')
  const rest = search.toString()
  return rest ? `?${rest}` : ''
}

function mapOldAddress(prefix: string, segments: string[], searchStr: string): { path: string; searchStr: string } {
  const [slug, page, ...rest] = segments
  if (prefix === 'g') return { path: slug ? `/share/${slug}` : HOME_PATH, searchStr }
  if (prefix === 'onboarding' || prefix === 'workspace') return { path: CREATE_WORKSPACE_PATH, searchStr }
  if (!slug) return { path: HOME_PATH, searchStr }
  if (prefix === 'w') {
    if (page === undefined) return { path: placePath(slug, new URLSearchParams(searchStr).get('in')), searchStr: dropPlaceParam(searchStr) }
    if (page === 'activity' && rest.length === 0) return { path: `/${slug}/activity`, searchStr }
    if (page === 's' && rest.length === 1) return { path: `/${slug}/scenes/${rest[0]}`, searchStr }
    if (page === 'settings') return { path: settingsPath(slug, rest), searchStr }
    return { path: `/${slug}`, searchStr }
  }
  if (prefix === 'o') {
    if (page === undefined) return { path: `/${slug}`, searchStr }
    if ((page === 'private' || page === DRAFTS) && rest.length === 0) return { path: `/${slug}/drafts`, searchStr }
    if (page === 'settings') return { path: settingsPath(slug, rest), searchStr }
    if (rest.length === 0) return { path: `/${slug}/collections/${page}`, searchStr }
    return { path: `/${slug}`, searchStr }
  }
  if (page !== undefined && rest.length === 0) return { path: `/${slug}/scenes/${page}`, searchStr }
  return { path: `/${slug}`, searchStr }
}

export function legacyHref(location: Location): string {
  const [prefix = '', ...segments] = location.pathname.split('/').filter(Boolean)
  const { path, searchStr } = mapOldAddress(prefix, segments, location.searchStr)
  return `${path}${searchStr}${location.hash ? `#${location.hash}` : ''}`
}
