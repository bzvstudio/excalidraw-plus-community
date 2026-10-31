import { THUMBNAILS_PATH } from '@repo/api/system.const'

export function thumbnailUrl(workspaceId: string, sceneId: string, version: string) {
  return `${THUMBNAILS_PATH}/${workspaceId}/${sceneId}?v=${encodeURIComponent(version)}`
}

export async function uploadThumbnail(workspaceId: string, sceneId: string, png: Blob) {
  const response = await fetch(`${THUMBNAILS_PATH}/${workspaceId}/${sceneId}`, { method: 'PUT', body: png })
  if (!response.ok) throw new Error(`Uploading the thumbnail failed (${response.status})`)
}
