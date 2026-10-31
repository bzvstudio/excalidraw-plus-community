import { keepPreviousData, useInfiniteQuery, useQuery } from '@tanstack/react-query'
import { ChevronLeftIcon, ChevronRightIcon, ScrollTextIcon, XIcon } from 'lucide-react'
import { type ReactNode, useState } from 'react'
import { AdminsOnly } from '@/components/settings/admins-only'
import { SettingsHeading, SettingsNote } from '@/components/settings/settings-section'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/ui/empty-state'
import { DelayedSkeleton, Skeleton } from '@/components/ui/skeleton'
import { AuditTable } from '@/components/workspaces/audit-table'
import { OptionSelect } from '@/components/workspaces/option-select'
import { AUDIT_ACTION_OPTIONS, AUDIT_PAGE_SIZE, type AuditActionName } from '@/constants/audit'
import { canManageWorkspace } from '@/helpers/roles'
import { settingsPage } from '@/helpers/settings-pages'
import { useWorkspace } from '@/hooks/use-workspace'
import { auditLogQuery } from '@/services/audit/audit'
import { trpc } from '@/trpc'
import type { AuditEntryItem } from '@/types/api'

const PAGE = settingsPage('audit-log')

export function AuditRoute() {
  const { workspace } = useWorkspace()
  const canManage = canManageWorkspace(workspace.role)
  const [action, setAction] = useState('all')
  const [actor, setActor] = useState<{ id: string; name: string }>()
  const [index, setIndex] = useState(0)
  const members = useQuery({ ...trpc.workspaces.members.queryOptions({ workspaceId: workspace.id }), enabled: canManage }).data ?? []
  const keys = useQuery({ ...trpc.apiKeys.list.queryOptions({ workspaceId: workspace.id }), enabled: canManage }).data ?? []
  const actors = [
    ...members.map((member) => ({ id: member.userId, name: member.name })),
    ...keys.map((key) => ({ id: key.id, name: `${key.name} (API key)` })),
  ]
  const log = useInfiniteQuery({
    ...auditLogQuery(workspace.id, {
      ...(action !== 'all' && { action: action as AuditActionName }),
      ...(actor && { actorId: actor.id }),
    }),
    placeholderData: keepPreviousData,
    enabled: canManage,
  })
  const pages = log.data?.pages ?? []
  const shown = Math.min(index, Math.max(0, pages.length - 1))

  return (
    <AuditPage
      canManage={canManage}
      status={log.isPending ? 'loading' : log.isError && !log.data ? 'failed' : 'ready'}
      events={pages[shown]?.events ?? []}
      page={shown}
      action={action}
      actors={actors}
      actorId={actor?.id}
      hasOlder={shown < pages.length - 1 || log.hasNextPage}
      loadingOlder={log.isFetchingNextPage || log.isPlaceholderData}
      olderFailed={log.isFetchNextPageError}
      onAction={(next) => {
        setAction(next)
        setIndex(0)
      }}
      onActor={(id, name) => {
        setActor(id === 'all' ? undefined : { id, name })
        setIndex(0)
      }}
      onNewer={() => setIndex(Math.max(0, shown - 1))}
      onOlder={async () => {
        if (shown === pages.length - 1) {
          const result = await log.fetchNextPage()
          if (result.isError) return
        }
        setIndex(shown + 1)
      }}
      onRetry={() => void log.refetch()}
    />
  )
}

export function AuditPage({
  canManage,
  status,
  events,
  page,
  action,
  actors,
  actorId,
  hasOlder,
  loadingOlder,
  olderFailed,
  onAction,
  onActor,
  onNewer,
  onOlder,
  onRetry,
}: {
  canManage: boolean
  status: 'loading' | 'failed' | 'ready'
  events: AuditEntryItem[]
  page: number
  action: string
  actors: { id: string; name: string }[]
  actorId?: string
  hasOlder: boolean
  loadingOlder: boolean
  olderFailed: boolean
  onAction: (action: string) => void
  onActor: (actorId: string, name: string) => void
  onNewer: () => void
  onOlder: () => void
  onRetry: () => void
}) {
  if (!canManage) {
    return (
      <>
        <SettingsHeading title={PAGE.label} description={PAGE.description} />
        <AdminsOnly what="to know who changed something" />
      </>
    )
  }

  const filtered = action !== 'all' || actorId !== undefined
  const first = page * AUDIT_PAGE_SIZE + 1

  return (
    <>
      <SettingsHeading title={PAGE.label} description={PAGE.description} />
      <div role="group" aria-label="Filters" className="mb-4 flex flex-wrap items-center gap-2">
        <OptionSelect
          label="Who"
          value={actorId ?? 'all'}
          options={[
            { value: 'all', label: 'Anyone' },
            ...actors.map(({ id, name }) => ({ value: id, label: name })),
            ...(actorId && !actors.some(({ id }) => id === actorId) ? [{ value: actorId, label: 'Someone no longer here' }] : []),
          ]}
          onChange={(id) => onActor(id, actors.find((candidate) => candidate.id === id)?.name ?? '')}
          className="w-full sm:w-52"
        />
        <OptionSelect label="What" value={action} options={AUDIT_ACTION_OPTIONS} onChange={onAction} className="w-full sm:w-60" />
        {filtered && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              onAction('all')
              onActor('all', '')
            }}
          >
            <XIcon aria-hidden />
            Clear filters
          </Button>
        )}
      </div>
      {status === 'loading' ? (
        <DelayedSkeleton label="Loading the audit log">
          <div className="flex flex-col gap-px overflow-hidden rounded-xl border">
            {Array.from({ length: 6 }, (_, row) => (
              <Skeleton key={row} className="h-14 rounded-none" />
            ))}
          </div>
        </DelayedSkeleton>
      ) : status === 'failed' ? (
        <div role="alert" className="flex flex-wrap items-center gap-3 rounded-xl border px-4 py-3 text-sm text-destructive">
          The audit log couldn’t be loaded.
          <Button variant="outline" size="sm" onClick={onRetry}>
            Try again
          </Button>
        </div>
      ) : events.length === 0 ? (
        <EmptyState
          icon={ScrollTextIcon}
          title={filtered ? 'Nothing matches these filters' : 'Nothing recorded yet'}
          description={
            filtered
              ? 'Try someone else, or another kind of change.'
              : 'Changes to members, teams, links and keys will show up here.'
          }
          className="rounded-xl border border-dashed"
        />
      ) : (
        <div aria-busy={loadingOlder} className={loadingOlder ? 'opacity-60 transition-opacity duration-150' : undefined}>
          <AuditTable events={events} onActor={onActor} />
        </div>
      )}
      {status === 'ready' && (page > 0 || hasOlder) && (
        <nav aria-label="Audit log pages" className="mt-3 flex items-center justify-between gap-3">
          <p className="text-xs text-muted-foreground tabular-nums" aria-live="polite">
            {events.length > 0 ? `Entries ${first}–${first + events.length - 1}` : ''}
          </p>
          <div className="flex items-center gap-2">
            {olderFailed && (
              <span role="alert" className="text-xs text-destructive">
                Older entries couldn’t be loaded.
              </span>
            )}
            <PageButton unavailable={page === 0} busy={loadingOlder} onPress={onNewer}>
              <ChevronLeftIcon aria-hidden />
              Newer
            </PageButton>
            <PageButton unavailable={!hasOlder} busy={loadingOlder} onPress={onOlder}>
              {olderFailed ? 'Try again' : 'Older'}
              <ChevronRightIcon aria-hidden />
            </PageButton>
          </div>
        </nav>
      )}
      <SettingsNote>
        Kept here: members and roles, teams, invite and share links, API and AI keys, workspace settings, who can see a collection, and
        scenes moved or deleted. Nothing anyone draws or writes is recorded.
      </SettingsNote>
    </>
  )
}

function PageButton({
  unavailable,
  busy,
  onPress,
  children,
}: {
  unavailable: boolean
  busy: boolean
  onPress: () => void
  children: ReactNode
}) {
  return (
    <Button
      variant="outline"
      size="sm"
      aria-disabled={unavailable || undefined}
      aria-busy={busy || undefined}
      className="aria-disabled:cursor-default aria-disabled:opacity-50 aria-disabled:hover:bg-transparent"
      onClick={() => {
        if (!unavailable && !busy) onPress()
      }}
    >
      {children}
    </Button>
  )
}
