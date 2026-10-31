import { DRAFTS } from '@repo/api/scenes.const'
import { linkOptions } from '@tanstack/react-router'
import { SETTINGS_ROUTES, type SettingsPageId } from '@/constants/settings'

export function workspaceLink(slug: string) {
  return linkOptions({ to: '/$slug', params: { slug } })
}

export function placeLink(slug: string, place: string | undefined) {
  if (place === undefined) return workspaceLink(slug)
  if (place === DRAFTS) return linkOptions({ to: '/$slug/drafts', params: { slug } })
  return linkOptions({ to: '/$slug/collections/$collectionId', params: { slug, collectionId: place } })
}

export function activityLink(slug: string) {
  return linkOptions({ to: '/$slug/activity', params: { slug } })
}

export function sceneLink(slug: string, sceneId: string) {
  return linkOptions({ to: '/$slug/scenes/$sceneId', params: { slug, sceneId } })
}

export function sharedSceneLink(linkId: string) {
  return linkOptions({ to: '/share/$linkId', params: { linkId } })
}

export function newWorkspaceLink() {
  return linkOptions({ to: '/new' })
}

export function settingsLink(slug: string, page: SettingsPageId = 'general') {
  return linkOptions({ to: SETTINGS_ROUTES[page], params: { slug } })
}

export function newApiKeyLink(slug: string) {
  return linkOptions({ to: '/$slug/settings/api-keys/new', params: { slug } })
}

export function isScenePath(pathname: string): boolean {
  return /^\/[^/]+\/scenes\/[^/]+\/?$/.test(pathname)
}

export function pageTitle(productName: string, page?: string): string {
  return page ? `${page} — ${productName}` : productName
}
