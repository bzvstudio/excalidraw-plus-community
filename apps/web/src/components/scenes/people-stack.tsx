import { CheckIcon, XIcon } from 'lucide-react'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { Avatar } from '@/components/ui/avatar'
import { colorOf, type Peer } from '@/helpers/presence'
import { cn } from '@/lib/utils'
import { avatarImage } from '@/services/avatars/avatars'

function PeerAvatar({ peer, className }: { peer: Peer; className?: string }) {
  const color = colorOf(peer.id)
  return (
    <Avatar
      name={peer.name}
      seed={peer.id}
      image={avatarImage(peer.avatarId)}
      className={cn('size-7 text-xs font-semibold ring-2 ring-background', className)}
      style={{ backgroundColor: color.background, color: color.stroke }}
    />
  )
}

function firstName(name: string): string {
  return name.split(' ')[0] ?? name
}

export function PeopleStack({
  peers,
  followingId,
  max = 4,
  onFollow,
}: {
  peers: readonly Peer[]
  followingId?: string
  max?: number
  onFollow: (peer: Peer) => void
}) {
  const followed = peers.find((peer) => peer.id === followingId)
  const status = (
    <span role="status" className="sr-only">
      {followed ? `Following ${followed.name}` : ''}
    </span>
  )
  if (peers.length === 0) return status
  const shown = peers.length > max ? peers.slice(0, max - 1) : peers
  const hidden = peers.slice(shown.length)

  return (
    <div className="flex items-center gap-2">
      {status}
      {followed && (
        <span className="flex h-7 items-center gap-1 rounded-full bg-brand/12 pr-0.5 text-xs font-medium text-brand duration-150 animate-in fade-in-0 max-md:pl-0.5 md:pl-2.5 motion-reduce:animate-none">
          <span aria-hidden className="max-w-32 truncate max-md:hidden">
            Following {firstName(followed.name)}
          </span>
          <button
            type="button"
            aria-label="Stop following"
            onClick={() => onFollow(followed)}
            className="flex size-6 items-center justify-center rounded-full outline-none hover:bg-brand/15 focus-visible:ring-3 focus-visible:ring-ring"
          >
            <XIcon aria-hidden className="size-3.5" />
          </button>
        </span>
      )}
      <div role="group" aria-label="In this scene" className="flex items-center -space-x-1.5 pr-1">
        {shown.map((peer) => {
          const following = peer.id === followingId
          return (
            <Tooltip key={peer.id}>
              <TooltipTrigger
                render={
                  <button
                    type="button"
                    aria-label={following ? `Stop following ${peer.name}` : `Follow ${peer.name}`}
                    aria-pressed={following}
                    onClick={() => onFollow(peer)}
                    className="relative rounded-full outline-none transition-transform duration-150 hover:z-10 hover:-translate-y-0.5 focus-visible:z-10 focus-visible:ring-3 focus-visible:ring-ring motion-reduce:transition-none"
                  />
                }
              >
                <PeerAvatar peer={peer} className={cn(following && 'ring-brand')} />
              </TooltipTrigger>
              <TooltipContent side="bottom">{following ? `Following ${peer.name} — click to stop` : `${peer.name} — click to follow`}</TooltipContent>
            </Tooltip>
          )
        })}
        {hidden.length > 0 && (
          <DropdownMenu>
            <DropdownMenuTrigger
              aria-label={`${hidden.length} more in this scene`}
              className="relative flex size-7 items-center justify-center rounded-full bg-muted text-xs font-medium text-muted-foreground tabular-nums ring-2 ring-background outline-none hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring"
            >
              +{hidden.length}
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="min-w-52">
              <DropdownMenuLabel>Click someone to follow their view</DropdownMenuLabel>
              {hidden.map((peer) => (
                <DropdownMenuItem key={peer.id} onClick={() => onFollow(peer)}>
                  <PeerAvatar peer={peer} className="size-5 text-[10px] ring-0" />
                  <span className="flex-1 truncate">{peer.name}</span>
                  {peer.id === followingId && (
                    <>
                      <CheckIcon aria-hidden />
                      <span className="sr-only">, following</span>
                    </>
                  )}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
    </div>
  )
}
