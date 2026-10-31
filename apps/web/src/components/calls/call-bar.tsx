import { MicIcon, MicOffIcon, MonitorUpIcon, PhoneOffIcon, Volume2Icon } from 'lucide-react'
import { Avatar } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { AUDIO_BLOCKED } from '@/constants/calls'
import { cn } from '@/lib/utils'
import { avatarImage } from '@/services/avatars/avatars'
import type { CallSnapshot } from '@/services/calls/call-session'

const NOTE = 'rounded-lg bg-popover px-3 py-1.5 text-xs text-popover-foreground shadow-float'

function CallControl({
  label,
  pressed,
  destructive,
  onClick,
  children,
}: {
  label: string
  pressed?: boolean
  destructive?: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <Button
            variant={destructive ? 'destructive' : pressed ? 'secondary' : 'ghost'}
            size="icon-sm"
            className="rounded-full"
            aria-pressed={pressed}
            aria-label={label}
            onClick={onClick}
          />
        }
      >
        {children}
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  )
}

export function CallBar({
  snapshot,
  notice,
  onMute,
  onShare,
  onStartAudio,
  onLeave,
}: {
  snapshot: CallSnapshot
  notice?: string
  onMute: (muted: boolean) => void
  onShare: (sharing: boolean) => void
  onStartAudio: () => void
  onLeave: () => void
}) {
  return (
    <div className="flex flex-col items-center gap-2" role="region" aria-label="Call">
      {notice && <p className={cn(NOTE, 'text-muted-foreground')}>{notice}</p>}
      {snapshot.audioBlocked && (
        <div className={cn(NOTE, 'flex items-center gap-2')}>
          {AUDIO_BLOCKED}
          <Button size="xs" onClick={onStartAudio}>
            <Volume2Icon aria-hidden />
            Turn on sound
          </Button>
        </div>
      )}
      <div className="flex items-center gap-1 rounded-full bg-popover py-1 pr-1 pl-2 text-popover-foreground shadow-float duration-200 animate-in fade-in-0 slide-in-from-bottom-2 motion-reduce:animate-none">
        <ul className="flex items-center -space-x-1.5 pr-1.5" aria-label="In the call">
          {snapshot.people.map((person) => (
            <li
              key={person.id}
              title={`${person.isYou ? `${person.name} (you)` : person.name}${person.muted ? ', muted' : ''}${person.speaking ? ', speaking' : ''}`}
              className="relative"
            >
              <Avatar
                name={person.name}
                seed={person.name}
                image={avatarImage(person.avatarId)}
                size="sm"
                className={cn('ring-2 ring-popover transition-shadow duration-150', person.speaking && 'ring-brand')}
              />
              <span className="sr-only">
                {person.isYou ? `${person.name} (you)` : person.name}
                {person.muted && ', muted'}
                {person.speaking && ', speaking'}
              </span>
              {person.muted && (
                <MicOffIcon aria-hidden className="absolute -right-1 -bottom-1 size-3.5 rounded-full bg-popover p-0.5 text-muted-foreground" />
              )}
            </li>
          ))}
        </ul>
        <span aria-hidden className="mx-0.5 h-5 w-px bg-border" />
        <CallControl label={snapshot.muted ? 'Unmute' : 'Mute'} pressed={snapshot.muted} onClick={() => onMute(!snapshot.muted)}>
          {snapshot.muted ? <MicOffIcon aria-hidden /> : <MicIcon aria-hidden />}
        </CallControl>
        <CallControl
          label={snapshot.sharing ? 'Stop sharing your screen' : 'Share your screen'}
          pressed={snapshot.sharing}
          onClick={() => onShare(!snapshot.sharing)}
        >
          <MonitorUpIcon aria-hidden />
        </CallControl>
        <CallControl label="Leave the call" destructive onClick={onLeave}>
          <PhoneOffIcon aria-hidden />
        </CallControl>
      </div>
    </div>
  )
}
