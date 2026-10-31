import { CheckIcon, PencilIcon, RotateCcwIcon, Trash2Icon, XIcon } from 'lucide-react'
import { useState } from 'react'
import { Avatar } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { FORMER_MEMBER } from '@/constants/comments'
import { linkify } from '@/helpers/linkify'
import { timeAgo } from '@/helpers/time'
import { avatarImage } from '@/services/avatars/avatars'
import type { CommentThread } from '@/types/api'
import type { SubmitResult } from '@/types/forms'
import { MOD_KEY } from '@/helpers/platform'

function Body({ text }: { text: string }) {
  return (
    <p className="text-sm leading-relaxed break-words whitespace-pre-wrap">
      {linkify(text).map((part, index) =>
        part.href ? (
          <a key={index} href={part.href} target="_blank" rel="noopener noreferrer nofollow" className="underline decoration-foreground/30 underline-offset-2 hover:decoration-foreground">
            {part.text}
          </a>
        ) : (
          part.text
        ),
      )}
    </p>
  )
}

function Composer({
  label,
  initial = '',
  onSubmit,
  onCancel,
}: {
  label: string
  initial?: string
  onSubmit: (body: string) => Promise<SubmitResult>
  onCancel?: () => void
}) {
  const [body, setBody] = useState(initial)
  const [error, setError] = useState<string>()
  const [busy, setBusy] = useState(false)

  const submit = async (event: React.FormEvent) => {
    event.preventDefault()
    if (busy || !body.trim()) return
    setBusy(true)
    const result = await onSubmit(body)
    setBusy(false)
    setError(result.error)
    if (!result.error) setBody('')
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-2">
      <Textarea
        aria-label={label}
        placeholder={label === 'Reply' ? 'Write a reply…' : label === 'Comment' ? 'Say what this needs…' : undefined}
        className="max-h-40 min-h-16 resize-none"
        value={body}
        onChange={(event) => setBody(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === 'Enter' && (event.metaKey || event.ctrlKey)) void submit(event)
          if (event.key !== 'Escape') event.stopPropagation()
        }}
        autoFocus
      />
      {error && (
        <p role="alert" className="text-xs text-destructive">
          {error}
        </p>
      )}
      <div className="flex items-center justify-end gap-2">
        {label !== 'Save' && <span className="mr-auto text-[11px] text-muted-foreground max-sm:hidden">{MOD_KEY} Enter to send</span>}
        {onCancel && (
          <Button type="button" variant="ghost" size="sm" onClick={onCancel}>
            Cancel
          </Button>
        )}
        <Button type="submit" size="sm" disabled={busy || !body.trim()}>
          {label}
        </Button>
      </div>
    </form>
  )
}

export function CommentThreadCard({
  thread,
  canPost,
  canResolve,
  onPost,
  onEdit,
  onRemove,
  onResolve,
  onClose,
}: {
  thread?: CommentThread
  canPost: boolean
  canResolve: boolean
  onPost: (body: string) => Promise<SubmitResult>
  onEdit: (commentId: string, body: string) => Promise<SubmitResult>
  onRemove: (commentId: string) => Promise<SubmitResult>
  onResolve: (resolved: boolean) => Promise<SubmitResult>
  onClose: () => void
}) {
  const [editing, setEditing] = useState<string>()
  const [error, setError] = useState<string>()
  const act = async (result: Promise<SubmitResult>) => setError((await result).error)

  return (
    <div
      role="dialog"
      aria-label="Comment thread"
      className="flex max-h-[min(28rem,calc(100dvh-8rem))] w-80 max-w-[calc(100vw-2rem)] flex-col rounded-xl bg-popover text-popover-foreground shadow-float duration-150 animate-in fade-in-0 zoom-in-95 motion-reduce:animate-none"
      onKeyDown={(event) => event.key === 'Escape' && onClose()}
    >
      <div className="flex h-11 shrink-0 items-center gap-2 border-b pr-1.5 pl-3">
        <span className="text-xs font-medium text-muted-foreground">
          {thread ? (thread.resolvedAt ? 'Resolved thread' : 'Thread') : 'New comment'}
        </span>
        <div className="ml-auto flex gap-0.5">
          {thread && canResolve && (
            <Tooltip>
              <TooltipTrigger
                render={
                  <Button
                    variant="ghost"
                    size="icon-xs"
                    aria-label={thread.resolvedAt ? 'Reopen' : 'Resolve'}
                    onClick={() => void act(onResolve(!thread.resolvedAt))}
                  />
                }
              >
                {thread.resolvedAt ? <RotateCcwIcon aria-hidden /> : <CheckIcon aria-hidden />}
              </TooltipTrigger>
              <TooltipContent>{thread.resolvedAt ? 'Reopen thread' : 'Mark as resolved'}</TooltipContent>
            </Tooltip>
          )}
          <Button variant="ghost" size="icon-xs" aria-label="Close" onClick={onClose}>
            <XIcon aria-hidden />
          </Button>
        </div>
      </div>
      <div className="flex min-h-0 flex-col gap-4 overflow-y-auto overscroll-contain p-3">
      {thread?.comments.map((comment) => (
        <div key={comment.id} className="group/comment flex gap-2.5">
          <Avatar
            name={comment.authorName ?? FORMER_MEMBER}
            seed={comment.authorName ?? FORMER_MEMBER}
            image={avatarImage(comment.authorAvatarId)}
            size="sm"
            className="mt-0.5"
          />
          <div className="flex min-w-0 flex-1 flex-col gap-1">
          <div className="flex min-h-7 items-center gap-1.5 text-xs">
            <span className="truncate font-medium">{comment.authorName ?? FORMER_MEMBER}</span>
            {comment.isGuest && <span className="rounded-full bg-muted px-1.5 text-[11px] text-muted-foreground">guest</span>}
            <span className="shrink-0 text-muted-foreground">
              {timeAgo(new Date(comment.createdAt))}
              {comment.editedAt && ' · edited'}
            </span>
            <span className="ml-auto flex gap-0.5 opacity-100 transition-opacity duration-150 pointer-fine:opacity-0 pointer-fine:group-hover/comment:opacity-100 pointer-fine:group-focus-within/comment:opacity-100">
              {comment.canEdit && (
                <Button variant="ghost" size="icon-xs" aria-label="Edit comment" onClick={() => setEditing(comment.id)}>
                  <PencilIcon aria-hidden />
                </Button>
              )}
              {comment.canDelete && (
                <Button variant="ghost" size="icon-xs" aria-label="Delete comment" onClick={() => void act(onRemove(comment.id))}>
                  <Trash2Icon aria-hidden />
                </Button>
              )}
            </span>
          </div>
          {editing === comment.id ? (
            <Composer
              label="Save"
              initial={comment.body}
              onSubmit={async (body) => {
                const result = await onEdit(comment.id, body)
                if (!result.error) setEditing(undefined)
                return result
              }}
              onCancel={() => setEditing(undefined)}
            />
          ) : (
            <Body text={comment.body} />
          )}
          </div>
        </div>
      ))}
      {error && (
        <p role="alert" className="text-xs text-destructive">
          {error}
        </p>
      )}
      {canPost ? (
        <Composer label={thread ? 'Reply' : 'Comment'} onSubmit={onPost} onCancel={thread ? undefined : onClose} />
      ) : (
        <p className="text-xs text-muted-foreground">You can read comments here, but not add them.</p>
      )}
      </div>
    </div>
  )
}
