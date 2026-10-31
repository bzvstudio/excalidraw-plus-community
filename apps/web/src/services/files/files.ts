import { FILES_PATH, SHARED_PATH } from '@repo/api/system.const'
import { isRefusalStatus } from '@/helpers/scene-sync'

export class FileRefused extends Error {
  readonly status: number

  constructor(status: number, message: string) {
    super(message)
    this.status = status
  }
}

export type FileTransfer = {
  upload: (fileId: string, bytes: Uint8Array<ArrayBuffer>) => Promise<void>
  download: (fileId: string) => Promise<Blob | undefined>
}

async function errorMessageOf(response: Response): Promise<string> {
  const body = (await response.json().catch(() => undefined)) as { error?: string } | undefined
  return body?.error ?? `The server refused the image (${response.status})`
}

function transferAt(base: string): FileTransfer {
  return {
    upload: async (fileId, bytes) => {
      const response = await fetch(`${base}/${encodeURIComponent(fileId)}`, { method: 'PUT', body: bytes })
      if (response.ok) return
      if (isRefusalStatus(response.status)) throw new FileRefused(response.status, await errorMessageOf(response))
      throw new Error(`Uploading an image failed (${response.status})`)
    },
    download: async (fileId) => {
      const response = await fetch(`${base}/${encodeURIComponent(fileId)}`)
      return response.ok ? response.blob() : undefined
    },
  }
}

export function sceneFiles(workspaceId: string, sceneId: string): FileTransfer {
  return transferAt(`${FILES_PATH}/${workspaceId}/${sceneId}`)
}

export function sharedFiles(linkId: string): FileTransfer {
  return transferAt(`${SHARED_PATH}/${linkId}/files`)
}
