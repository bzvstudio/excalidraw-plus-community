import type { AppRouter } from '@repo/api'
import type { inferRouterOutputs } from '@trpc/server'

type RouterOutputs = inferRouterOutputs<AppRouter>

export type WorkspaceMember = RouterOutputs['workspaces']['members'][number]

export type WorkspaceInvite = RouterOutputs['workspaces']['invites'][number]

export type RemovedMember = RouterOutputs['workspaces']['removed'][number]

export type SceneListItem = RouterOutputs['scenes']['list'][number]

export type Collection = RouterOutputs['collections']['list'][number]

export type Team = RouterOutputs['teams']['list'][number]

export type LibraryItemData = RouterOutputs['library']['get']['items'][number]

export type ShareLinkSummary = RouterOutputs['shares']['list'][number]

export type SceneCommentsData = RouterOutputs['comments']['list']

export type CommentThread = SceneCommentsData['threads'][number]

export type WorkspaceAiKey = NonNullable<RouterOutputs['ai']['workspaceKey']>

export type ApiKeyItem = RouterOutputs['apiKeys']['list'][number]

export type AuditEntryItem = RouterOutputs['audit']['list']['events'][number]

export type WorkspaceListItem = RouterOutputs['workspaces']['list'][number]

export type Principal = NonNullable<RouterOutputs['session']['get']>
