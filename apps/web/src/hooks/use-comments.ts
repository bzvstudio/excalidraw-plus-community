import type { CommentAnchor } from '@repo/api'
import { useQuery } from '@tanstack/react-query'
import { useCallback, useEffect, useState } from 'react'
import { bringIntoView, sceneElementsById, sceneElementsOf } from '@/editor/comments'
import type { EditorApi } from '@/editor/files'
import { anchorAt, anchorPoint, type ScenePoint } from '@repo/api/comments.utils'
import {
  type CommentPlace,
  commentFailure,
  commentsQuery,
  editComment,
  refreshComments,
  removeComment,
  replyToThread,
  resolveThread,
  startThread,
} from '@/services/comments/comments'
import type { CollabSocket } from '@/services/collab/collab'
import type { CommentThread } from '@/types/api'
import type { SubmitResult } from '@/types/forms'

async function attempt(work: () => Promise<unknown>): Promise<SubmitResult> {
  try {
    await work()
    return {}
  } catch (error) {
    return { error: commentFailure(error) }
  }
}

export function useComments(place: CommentPlace, api: EditorApi | null, socket: CollabSocket) {
  const comments = useQuery(commentsQuery(place))

  useEffect(() => {
    const onChanged = () => void refreshComments(place)
    socket.on('comments-changed', onChanged)
    return () => {
      socket.off('comments-changed', onChanged)
    }
  }, [place, socket])

  const [selectedId, setSelectedId] = useState<string>()
  const [draft, setDraft] = useState<CommentAnchor>()
  const [placing, setPlacing] = useState(false)
  const threads = comments.data?.threads ?? []
  const selected = threads.find((thread) => thread.id === selectedId)

  const close = useCallback(() => {
    setSelectedId(undefined)
    setDraft(undefined)
  }, [])

  const togglePlacing = useCallback(() => {
    close()
    setPlacing((current) => !current)
  }, [close])

  const cancelPlacing = useCallback(() => setPlacing(false), [])

  const placeAt = useCallback(
    (point: ScenePoint) => {
      if (!api) return
      setPlacing(false)
      setSelectedId(undefined)
      setDraft(anchorAt(point, sceneElementsOf(api)))
    },
    [api],
  )

  const select = useCallback(
    (thread: CommentThread) => {
      setDraft(undefined)
      setSelectedId(thread.id)
      if (api) bringIntoView(api, anchorPoint(thread.anchor, sceneElementsById(api)))
    },
    [api],
  )

  const post = (body: string) =>
    attempt(async () => {
      if (draft) {
        const threadId = await startThread(place, draft, body)
        setDraft(undefined)
        setSelectedId(threadId)
      } else if (selectedId) {
        await replyToThread(place, selectedId, body)
      }
    })

  return {
    threads,
    canPost: comments.data?.canPost ?? false,
    canResolve: comments.data?.canResolve ?? false,
    selected,
    selectedId,
    draft,
    placing,
    togglePlacing,
    cancelPlacing,
    placeAt,
    select,
    selectById: (id: string) => {
      setDraft(undefined)
      setSelectedId(id)
    },
    close,
    post,
    edit: (commentId: string, body: string) => attempt(() => editComment(place, commentId, body)),
    remove: (commentId: string) => attempt(() => removeComment(place, commentId)),
    resolve: (resolved: boolean) =>
      attempt(async () => {
        if (selectedId) await resolveThread(place, selectedId, resolved)
      }),
  }
}
