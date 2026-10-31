import { AVATARS_PATH } from '@repo/api/system.const'
import { AVATAR_PIXELS } from '@/constants/avatar'
import { centredSquare } from '@/helpers/avatar'
import { queryClient } from '@/trpc'
import type { SubmitResult } from '@/types/forms'

export function avatarImage(avatarId: string | null): string | undefined {
  return avatarId ? `${AVATARS_PATH}/${avatarId}` : undefined
}

async function squared(file: File): Promise<Blob> {
  const bitmap = await createImageBitmap(file)
  const { x, y, size } = centredSquare(bitmap.width, bitmap.height)
  const canvas = document.createElement('canvas')
  canvas.width = AVATAR_PIXELS
  canvas.height = AVATAR_PIXELS
  canvas.getContext('2d')!.drawImage(bitmap, x, y, size, size, 0, 0, AVATAR_PIXELS, AVATAR_PIXELS)
  bitmap.close()
  return new Promise((resolve, reject) =>
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error('The photo could not be read'))), 'image/webp', 0.9),
  )
}

async function send(path: string, init: RequestInit): Promise<SubmitResult> {
  let response: Response
  try {
    response = await fetch(path, init)
  } catch {
    return { error: 'Could not reach the server. Try again.' }
  }
  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as { error?: string } | null
    return { error: body?.error ?? 'Something went wrong. Try again.' }
  }
  await queryClient.invalidateQueries()
  return {}
}

async function upload(path: string, file: File): Promise<SubmitResult> {
  let photo: Blob
  try {
    photo = await squared(file)
  } catch {
    return { error: 'That file could not be read as a picture. Try a PNG, JPEG or WebP.' }
  }
  return send(path, { method: 'PUT', body: photo })
}

function workspacePhotoPath(workspaceId: string) {
  return `${AVATARS_PATH}/workspaces/${workspaceId}`
}

export async function uploadAvatar(file: File): Promise<SubmitResult> {
  return upload(AVATARS_PATH, file)
}

export async function removeAvatar(): Promise<SubmitResult> {
  return send(AVATARS_PATH, { method: 'DELETE' })
}

export async function uploadWorkspaceAvatar(workspaceId: string, file: File): Promise<SubmitResult> {
  return upload(workspacePhotoPath(workspaceId), file)
}

export async function removeWorkspaceAvatar(workspaceId: string): Promise<SubmitResult> {
  return send(workspacePhotoPath(workspaceId), { method: 'DELETE' })
}
