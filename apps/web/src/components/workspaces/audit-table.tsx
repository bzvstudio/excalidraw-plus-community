import { KeyRoundIcon } from 'lucide-react'
import { Avatar } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { AUDIT_ACTION_LABELS, AUDIT_ACTOR_FALLBACK, AUDIT_SUBJECTS, type AuditActionName } from '@/constants/audit'
import { auditDetails } from '@/helpers/audit'
import { timeAgo } from '@/helpers/time'
import { avatarImage } from '@/services/avatars/avatars'
import type { AuditEntryItem } from '@/types/api'

function subjectOf(action: string): string {
  const subject = action.slice(0, action.indexOf('.'))
  return AUDIT_SUBJECTS[subject] ?? subject
}

function sentenceCase(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1)
}

export function AuditTable({ events, onActor }: { events: AuditEntryItem[]; onActor: (actorId: string, name: string) => void }) {
  return (
    <Table>
      <caption className="sr-only">Audit events, newest first</caption>
      <TableHeader>
        <TableRow>
          <TableHead className="w-48 pl-4 max-md:hidden">Who</TableHead>
          <TableHead className="max-md:pl-4">What</TableHead>
          <TableHead className="w-36 pr-4 text-right max-sm:hidden">When</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {events.map((event) => {
          const actorName = event.actor.name ?? AUDIT_ACTOR_FALLBACK[event.actor.kind]
          const at = new Date(event.at)
          const details = auditDetails(event.metadata)
          const label = AUDIT_ACTION_LABELS[event.action as AuditActionName] ?? event.action
          const actor = (
            <button
              type="button"
              aria-label={`Show only what ${actorName} did`}
              onClick={() => onActor(event.actor.id, actorName)}
              className="flex max-w-full min-w-0 cursor-pointer items-center gap-2 rounded-sm text-left outline-none hover:underline focus-visible:ring-3 focus-visible:ring-ring"
            >
              {event.actor.kind === 'key' ? (
                <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground">
                  <KeyRoundIcon aria-hidden className="size-3" />
                </span>
              ) : (
                <Avatar name={actorName} seed={event.actor.id} image={avatarImage(event.actor.avatarId)} size="sm" />
              )}
              <span className="truncate font-medium text-foreground">{actorName}</span>
            </button>
          )
          return (
            <TableRow key={event.id} className="align-top">
              <TableCell className="max-w-48 py-3 pl-4 max-md:hidden">{actor}</TableCell>
              <TableCell className="py-3 whitespace-normal max-md:pl-4">
                <div className="mb-1 md:hidden">{actor}</div>
                <p className="text-sm text-foreground">
                  <Badge variant="outline" className="mr-2 align-[1px]">
                    {subjectOf(event.action)}
                  </Badge>
                  {sentenceCase(label.replace(/,$/, ''))}
                  {event.target?.name && <span className="font-medium"> {event.target.name}</span>}
                </p>
                {details && <p className="mt-0.5 text-xs text-muted-foreground">{details}</p>}
                <p className="mt-0.5 text-xs text-muted-foreground sm:hidden">
                  <time dateTime={at.toISOString()}>{timeAgo(at)}</time>
                </p>
              </TableCell>
              <TableCell className="py-3 pr-4 text-right whitespace-nowrap max-sm:hidden">
                <time dateTime={at.toISOString()} title={at.toLocaleString()} className="text-sm text-foreground">
                  {timeAgo(at)}
                </time>
                <p className="text-xs text-muted-foreground">
                  {at.toLocaleString(undefined, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                </p>
              </TableCell>
            </TableRow>
          )
        })}
      </TableBody>
    </Table>
  )
}
