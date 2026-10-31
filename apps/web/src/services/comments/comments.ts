import type { CommentAnchor } from '@repo/api'
import { TRPCClientError } from '@trpc/client'
import { queryClient, trpc, trpcClient } from '@/trpc'

export type CommentPlace = { workspaceId: string; sceneId: string } | { linkId: string }

export function commentsQuery(place: CommentPlace) {
  return trpc.comments.list.queryOptions(place)
}

export function refreshComments(place: CommentPlace) {
  return queryClient.invalidateQueries({ queryKey: trpc.comments.list.queryKey(place) })
}

export async function startThread(place: CommentPlace, anchor: CommentAnchor, body: string) {
  const { threadId } = await trpcClient.comments.start.mutate({ ...place, anchor, body })
  await refreshComments(place)
  return threadId
}

export async function replyToThread(place: CommentPlace, threadId: string, body: string) {
  await trpcClient.comments.reply.mutate({ ...place, threadId, body })
  await refreshComments(place)
}

export async function editComment(place: CommentPlace, commentId: string, body: string) {
  await trpcClient.comments.edit.mutate({ ...place, commentId, body })
  await refreshComments(place)
}

export async function removeComment(place: CommentPlace, commentId: string) {
  await trpcClient.comments.remove.mutate({ ...place, commentId })
  await refreshComments(place)
}

export async function resolveThread(place: CommentPlace, threadId: string, resolved: boolean) {
  await trpcClient.comments.resolve.mutate({ ...place, threadId, resolved })
  await refreshComments(place)
}

export function commentFailure(error: unknown): string {
  if (!(error instanceof TRPCClientError)) return 'The comment could not be saved. Try again.'
  return error.data?.code === 'BAD_REQUEST' ? 'A comment needs some text, and at most 5,000 characters.' : error.message
}
