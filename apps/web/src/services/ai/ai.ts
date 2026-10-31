import type { WorkspaceAiProvider } from '@repo/api'
import { AI_PATH } from '@repo/api/system.const'
import { queryClient, trpc, trpcClient } from '@/trpc'

export type Wireframe = {
  texts: string[]
  image: string
  theme: 'light' | 'dark'
}

export function textToDiagramUrl(sceneId: string): string {
  return `${AI_PATH}/scenes/${sceneId}/text-to-diagram`
}

export async function requestDiagramToCode(
  sceneId: string,
  wireframe: Wireframe,
  signal: AbortSignal,
): Promise<ReadableStreamDefaultReader<Uint8Array>> {
  const response = await fetch(`${AI_PATH}/scenes/${sceneId}/diagram-to-code`, {
    method: 'POST',
    headers: { accept: 'text/event-stream', 'content-type': 'application/json' },
    body: JSON.stringify(wireframe),
    signal,
  })
  if (!response.ok || !response.body) {
    const body = (await response.json().catch(() => undefined)) as { error?: string } | undefined
    throw new Error(body?.error ?? `The page could not be generated (${response.status})`)
  }
  return response.body.getReader()
}

export type WorkspaceKeyInput = {
  provider: WorkspaceAiProvider
  apiKey: string
  model: string
  visionModel: string | null
}

async function refreshAi(workspaceId: string) {
  await Promise.all([
    queryClient.invalidateQueries({ queryKey: trpc.ai.workspaceKey.queryKey({ workspaceId }) }),
    queryClient.invalidateQueries({ queryKey: trpc.ai.options.queryKey({ workspaceId }) }),
  ])
}

export async function saveWorkspaceKey(workspaceId: string, input: WorkspaceKeyInput) {
  await trpcClient.ai.setWorkspaceKey.mutate({ workspaceId, ...input })
  await refreshAi(workspaceId)
}

export async function removeWorkspaceKey(workspaceId: string) {
  await trpcClient.ai.removeWorkspaceKey.mutate({ workspaceId })
  await refreshAi(workspaceId)
}
