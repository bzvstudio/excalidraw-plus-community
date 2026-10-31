import { MessageSquareIcon } from 'lucide-react'
import { Avatar } from '@/components/ui/avatar'
import { EmptyState } from '@/components/ui/empty-state'
import { FORMER_MEMBER } from '@/constants/comments'
import { timeAgo } from '@/helpers/time'
import { cn } from '@/lib/utils'
import { avatarImage } from '@/services/avatars/avatars'
import type { CommentThread } from '@/types/api'

function ThreadRow({
  thread,
  number,
  selected,
  onSelect,
}: {
  thread: CommentThread
  number?: number
  selected: boolean
  onSelect: (thread: CommentThread) => void
}) {
  const [first] = thread.comments
  const author = first?.authorName ?? FORMER_MEMBER
  const more = thread.comments.length - 1
  return (
    <li>
      <button
        type="button"
        onClick={() => onSelect(thread)}
        aria-current={selected || undefined}
        className={cn(
          'flex w-full gap-3 rounded-lg px-3 py-2.5 text-left outline-none transition-colors duration-150 hover:bg-accent focus-visible:ring-3 focus-visible:ring-ring aria-[current]:bg-accent motion-reduce:transition-none',
          thread.resolvedAt && 'text-muted-foreground',
        )}
      >
        {number !== undefined ? (
          <span className="flex size-6 shrink-0 items-center justify-center rounded-full rounded-bl-none bg-primary text-[11px] font-semibold text-primary-foreground tabular-nums">
            {number}
          </span>
        ) : (
          <Avatar name={author} seed={author} image={avatarImage(first?.authorAvatarId ?? null)} size="sm" className="opacity-70" />
        )}
        <span className="flex min-w-0 flex-1 flex-col gap-0.5">
          <span className="flex items-baseline gap-2 text-xs">
            <span className={cn('truncate font-medium', !thread.resolvedAt && 'text-foreground')}>{author}</span>
            <span className="shrink-0 text-muted-foreground">{first ? timeAgo(new Date(first.createdAt)) : ''}</span>
          </span>
          <span className="line-clamp-2 text-sm break-words">{first?.body}</span>
          {more > 0 && (
            <span className="text-xs text-muted-foreground tabular-nums">
              {more === 1 ? '1 more comment' : `${more} more comments`}
            </span>
          )}
        </span>
      </button>
    </li>
  )
}

export function CommentList({
  threads,
  selectedId,
  canPost = true,
  onSelect,
}: {
  threads: CommentThread[]
  selectedId?: string
  canPost?: boolean
  onSelect: (thread: CommentThread) => void
}) {
  if (threads.length === 0) {
    return (
      <EmptyState
        icon={MessageSquareIcon}
        title="No comments yet"
        description={
          canPost
            ? 'Choose Add comment or press C, then click the spot on the canvas the comment is about.'
            : 'Comments people leave on this scene will show here.'
        }
      />
    )
  }

  const open = threads.filter((thread) => !thread.resolvedAt)
  const resolved = threads.filter((thread) => thread.resolvedAt)

  return (
    <div className="flex flex-col gap-4 p-2">
      {open.length > 0 && (
        <ol className="flex flex-col gap-0.5" aria-label="Open threads">
          {open.map((thread, index) => (
            <ThreadRow key={thread.id} thread={thread} number={index + 1} selected={selectedId === thread.id} onSelect={onSelect} />
          ))}
        </ol>
      )}
      {open.length === 0 && <p className="px-3 pt-2 text-sm text-muted-foreground">Every thread here is resolved.</p>}
      {resolved.length > 0 && (
        <section aria-labelledby="resolved-threads" className="flex flex-col gap-1">
          <h3 id="resolved-threads" className="px-3 text-xs font-medium text-muted-foreground">
            Resolved · <span className="tabular-nums">{resolved.length}</span>
          </h3>
          <ul className="flex flex-col gap-0.5">
            {resolved.map((thread) => (
              <ThreadRow key={thread.id} thread={thread} selected={selectedId === thread.id} onSelect={onSelect} />
            ))}
          </ul>
        </section>
      )}
    </div>
  )
}
