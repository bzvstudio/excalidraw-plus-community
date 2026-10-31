import { isUuid } from '@/helpers/address'
import { messageOf } from '@/helpers/results'
import { DRAFTS } from '@repo/api/scenes.const'
import { TRPCClientError } from '@trpc/client'
import { hashKey } from '@tanstack/react-query'
import { movedIn, placeOfListKey, renamedIn, withoutScene, withScene } from '@/helpers/scene-list'
import { sceneTitleOf } from '@/helpers/scene-title'
import { sceneFiles } from '@/services/files/files'
import { uploadThumbnail } from '@/services/thumbnails/thumbnails'
import { queryClient, trpc, trpcClient } from '@/trpc'
import type { SceneListItem } from '@/types/api'

const MISSING_CODES = new Set(['NOT_FOUND', 'BAD_REQUEST'])

export async function loadScene(workspaceId: string, sceneId: string) {
  if (!isUuid(sceneId)) return undefined
  try {
    return await trpcClient.scenes.get.query({ workspaceId, sceneId })
  } catch (error) {
    if (error instanceof TRPCClientError && MISSING_CODES.has(error.data?.code)) return undefined
    throw error
  }
}

export type LoadedScene = NonNullable<Awaited<ReturnType<typeof loadScene>>>

export function refreshList(workspaceId: string) {
  return queryClient.invalidateQueries({ queryKey: trpc.scenes.list.queryKey({ workspaceId }) })
}

export async function createScene(workspaceId: string, collectionId?: string) {
  const scene = await trpcClient.scenes.create.mutate({ workspaceId, collectionId })
  await refreshList(workspaceId)
  return scene
}

async function addFromFile(workspaceId: string, file: File, collectionId?: string) {
  const { readSceneFile } = await import('@/editor/import')
  const content = await readSceneFile(file)
  const scene = await trpcClient.scenes.create.mutate({
    workspaceId,
    collectionId,
    title: sceneTitleOf(file.name),
    content: { elements: content.elements, appState: content.appState },
  })
  try {
    const files = sceneFiles(workspaceId, scene.id)
    for (const file of content.files) await files.upload(file.id, file.bytes)
  } catch (error) {
    await trpcClient.scenes.delete.mutate({ workspaceId, sceneId: scene.id }).catch(() => undefined)
    throw error
  }
  if (content.thumbnail) await uploadThumbnail(workspaceId, scene.id, content.thumbnail).catch(() => undefined)
  return scene
}

export async function importScenes(workspaceId: string, files: File[], collectionId?: string) {
  const imported: { id: string }[] = []
  const failed: { name: string; message: string }[] = []
  for (const file of files) {
    try {
      imported.push(await addFromFile(workspaceId, file, collectionId))
    } catch (error) {
      failed.push({ name: file.name, message: messageOf(error) })
    }
  }
  if (imported.length > 0) await refreshList(workspaceId)
  return { imported, failed }
}

type ListChange = {
  apply: (list: SceneListItem[], place: string | undefined) => SceneListItem[]
  undo: (list: SceneListItem[], place: string | undefined, before: SceneListItem[] | undefined) => SceneListItem[]
}

const pendingChanges = new Map<string, number>()

export function pendingSceneChanges(workspaceId: string): number {
  return pendingChanges.get(workspaceId) ?? 0
}

function cachedLists(workspaceId: string) {
  return queryClient.getQueriesData<SceneListItem[]>({ queryKey: trpc.scenes.list.queryKey({ workspaceId }) })
}

async function optimistically(workspaceId: string, change: ListChange, run: () => Promise<unknown>) {
  pendingChanges.set(workspaceId, pendingSceneChanges(workspaceId) + 1)
  try {
    await queryClient.cancelQueries({ queryKey: trpc.scenes.list.queryKey({ workspaceId }) })
    const before = new Map<string, SceneListItem[]>()
    for (const [key, list] of cachedLists(workspaceId)) {
      if (!list) continue
      before.set(hashKey(key), list)
      queryClient.setQueryData(key, change.apply(list, placeOfListKey(key)))
    }
    try {
      await run()
    } catch (error) {
      for (const [key, list] of cachedLists(workspaceId)) {
        if (list) queryClient.setQueryData(key, change.undo(list, placeOfListKey(key), before.get(hashKey(key))))
      }
      throw error
    }
  } finally {
    const left = pendingSceneChanges(workspaceId) - 1
    if (left > 0) pendingChanges.set(workspaceId, left)
    else {
      pendingChanges.delete(workspaceId)
      void refreshList(workspaceId)
    }
  }
}

function wasAt(before: SceneListItem[] | undefined, sceneId: string) {
  const index = before?.findIndex(({ id }) => id === sceneId) ?? -1
  return index < 0 ? undefined : { index, scene: before![index]! }
}

export function moveScene(workspaceId: string, scene: SceneListItem, collectionId: string | null) {
  return optimistically(
    workspaceId,
    {
      apply: (list, place) => movedIn(list, place, scene, collectionId),
      undo: (list, place, before) => {
        if (place === undefined) {
          return list.map((item) =>
            item.id === scene.id && item.collectionId === collectionId ? { ...item, collectionId: scene.collectionId } : item,
          )
        }
        const was = wasAt(before, scene.id)
        return was ? withScene(list, was.scene, was.index) : withoutScene(list, scene.id)
      },
    },
    () => trpcClient.scenes.move.mutate({ workspaceId, sceneId: scene.id, to: collectionId ?? DRAFTS }),
  )
}

export function renameScene(workspaceId: string, scene: Pick<SceneListItem, 'id' | 'title'>, title: string) {
  return optimistically(
    workspaceId,
    {
      apply: (list) => renamedIn(list, scene.id, scene.title, title),
      undo: (list) => renamedIn(list, scene.id, title, scene.title),
    },
    () => trpcClient.scenes.rename.mutate({ workspaceId, sceneId: scene.id, title }),
  )
}

export function deleteScene(workspaceId: string, sceneId: string) {
  return optimistically(
    workspaceId,
    {
      apply: (list) => withoutScene(list, sceneId),
      undo: (list, _place, before) => {
        const was = wasAt(before, sceneId)
        return was ? withScene(list, was.scene, was.index) : list
      },
    },
    () => trpcClient.scenes.delete.mutate({ workspaceId, sceneId }),
  )
}
