import type { SceneAppState, SceneElement } from '@repo/api'
import { EMBED_AUTHORIZATION_SCHEME, EMBED_PATH } from '@repo/api/sharing.const'
import { SHARED_PATH } from '@repo/api/system.const'
import type { FileTransfer } from '@/services/files/files'

export type EmbeddedScene = { title: string; elements: SceneElement[]; appState: SceneAppState }

export class EmbedRefused extends Error {}

function authorization(token: string) {
  return { authorization: `${EMBED_AUTHORIZATION_SCHEME} ${token}` }
}

export function embedSnippet(token: string): string {
  return `<iframe src="${window.location.origin}${EMBED_PATH}#${token}" width="800" height="500" style="border:0" loading="lazy" title="Excalidraw scene"></iframe>`
}

export async function loadEmbeddedScene(token: string): Promise<EmbeddedScene> {
  const response = await fetch(`${SHARED_PATH}/embed/scene`, { headers: authorization(token) })
  if (!response.ok) throw new EmbedRefused('This scene is no longer available here')
  return (await response.json()) as EmbeddedScene
}

export function embedFiles(token: string): FileTransfer {
  return {
    upload: () => Promise.reject(new EmbedRefused('An embedded scene cannot be changed')),
    download: async (fileId) => {
      const response = await fetch(`${SHARED_PATH}/embed/files/${encodeURIComponent(fileId)}`, { headers: authorization(token) })
      return response.ok ? response.blob() : undefined
    },
  }
}
