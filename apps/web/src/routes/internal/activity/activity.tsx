import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { getRouteApi, Link } from '@tanstack/react-router'
import { DRAFTS } from '@repo/api/scenes.const'
import { HistoryIcon, ListFilterIcon } from 'lucide-react'
import { useMemo, useState } from 'react'
import { ActivityList, ActivityListSkeleton } from '@/components/activity/activity-list'
import { WorkspacePage } from '@/components/shell/workspace-page'
import { Button, buttonVariants } from '@/components/ui/button'
import { EmptyState } from '@/components/ui/empty-state'
import { PageTitle } from '@/components/ui/page-header'
import { DelayedSkeleton } from '@/components/ui/skeleton'
import { OptionSelect } from '@/components/workspaces/option-select'
import { ACTIVITY_PAGE_SIZE, ALL_PLACES, EVERYONE, OTHERS_DRAFTS } from '@/constants/activity'
import {
  type ActivityFilter,
  activityDays,
  activityFilterOf,
  activityPeople,
  activitySearchOf,
  filterActivity,
  hasOthersDrafts,
  isFiltered,
  placeNameOf,
} from '@/helpers/activity'
import { workspaceLink } from '@/helpers/places'
import { canEditScenes } from '@/helpers/roles'
import { useWorkspace } from '@/hooks/use-workspace'
import { thumbnailUrl } from '@/services/thumbnails/thumbnails'
import { trpc } from '@/trpc'
import type { Collection, SceneListItem } from '@/types/api'

const activityRoute = getRouteApi('/internal/$slug/activity')

export function ActivityRoute() {
  const { principal, workspace } = useWorkspace()
  const workspaceId = workspace.id
  const search = activityRoute.useSearch()
  const navigate = activityRoute.useNavigate()
  const scenes = useQuery({ ...trpc.scenes.list.queryOptions({ workspaceId }), placeholderData: keepPreviousData })
  const collections = useQuery(trpc.collections.list.queryOptions({ workspaceId }))

  return (
    <ActivityPage
      workspaceSlug={workspace.slug}
      workspaceName={workspace.name}
      userId={principal.userId}
      canEdit={canEditScenes(workspace.role)}
      scenes={scenes.data}
      collections={collections.data}
      filter={activityFilterOf(search)}
      onFilterChange={(filter) => void navigate({ search: activitySearchOf(filter), replace: true, resetScroll: false })}
      thumbnailSrcOf={(scene) =>
        scene.thumbnailUpdatedAt ? thumbnailUrl(workspaceId, scene.id, scene.thumbnailUpdatedAt) : undefined
      }
    />
  )
}

export function ActivityPage({
  workspaceSlug,
  workspaceName,
  userId,
  canEdit = false,
  scenes,
  collections,
  filter,
  onFilterChange,
  thumbnailSrcOf,
}: {
  workspaceSlug: string
  workspaceName: string
  userId: string
  canEdit?: boolean
  scenes: SceneListItem[] | undefined
  collections: Collection[] | undefined
  filter: ActivityFilter
  onFilterChange: (filter: ActivityFilter) => void
  thumbnailSrcOf: (scene: SceneListItem) => string | undefined
}) {
  const [shownFor, setShownFor] = useState({ key: '', count: ACTIVITY_PAGE_SIZE })
  const filterKey = `${filter.place}|${filter.person}`
  const shownCount = shownFor.key === filterKey ? shownFor.count : ACTIVITY_PAGE_SIZE
  const collectionNames = useMemo(() => new Map((collections ?? []).map(({ id, name }) => [id, name])), [collections])
  const people = useMemo(() => activityPeople(scenes ?? []), [scenes])
  const othersDrafts = useMemo(() => hasOthersDrafts(scenes ?? [], userId), [scenes, userId])
  const placeOptions = useMemo(
    () => [
      { value: ALL_PLACES, label: 'All places' },
      { value: DRAFTS, label: 'Your drafts' },
      ...(othersDrafts ? [{ value: OTHERS_DRAFTS, label: 'Others’ drafts' }] : []),
      ...(collections ?? []).map(({ id, name }) => ({ value: id, label: name })),
    ],
    [collections, othersDrafts],
  )
  const personOptions = useMemo(
    () => [{ value: EVERYONE, label: 'Everyone' }, ...people.map(({ id, name }) => ({ value: id, label: id === userId ? `${name} (you)` : name }))],
    [people, userId],
  )
  const knownFilter = useMemo<ActivityFilter>(
    () => ({
      place: placeOptions.some(({ value }) => value === filter.place) ? filter.place : ALL_PLACES,
      person: personOptions.some(({ value }) => value === filter.person) ? filter.person : EVERYONE,
    }),
    [placeOptions, personOptions, filter.place, filter.person],
  )
  const matching = useMemo(() => filterActivity(scenes ?? [], knownFilter, userId), [scenes, knownFilter, userId])
  const days = useMemo(() => activityDays(matching.slice(0, shownCount)), [matching, shownCount])
  const empty = scenes !== undefined && scenes.length === 0

  return (
    <WorkspacePage crumbs={[{ label: workspaceName, link: workspaceLink(workspaceSlug) }, { label: 'Activity' }]}>
      <div className="flex flex-col gap-8">
        <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="flex min-w-0 flex-col gap-1">
            <PageTitle className="text-xl">Activity</PageTitle>
            <p className="text-sm text-muted-foreground">The latest change to each scene you can open, newest first.</p>
          </div>
          {!empty && scenes !== undefined && (
            <div role="group" aria-label="Filter activity" className="flex shrink-0 items-center gap-2">
              <ListFilterIcon aria-hidden className="size-4 text-muted-foreground max-sm:hidden" />
              <OptionSelect
                label="Place"
                value={knownFilter.place}
                options={placeOptions}
                className="max-w-44 max-sm:flex-1"
                onChange={(place) => onFilterChange({ ...filter, place })}
              />
              <OptionSelect
                label="Person"
                value={knownFilter.person}
                options={personOptions}
                className="max-w-44 max-sm:flex-1"
                onChange={(person) => onFilterChange({ ...filter, person })}
              />
            </div>
          )}
        </header>

        {scenes === undefined ? (
          <DelayedSkeleton label="Loading activity" className="flex flex-col gap-3">
            <div className="h-4" />
            <ActivityListSkeleton rows={6} withThumbnails />
          </DelayedSkeleton>
        ) : empty ? (
          <EmptyState
            icon={HistoryIcon}
            title="No changes yet"
            description={`Whenever someone in ${workspaceName} edits a scene you can open, it shows up here with who changed it and when.`}
            action={
              canEdit && (
                <Link {...workspaceLink(workspaceSlug)} className={buttonVariants({ variant: 'outline', size: 'sm' })}>
                  Draw the first scene
                </Link>
              )
            }
            className="rounded-xl border border-dashed"
          />
        ) : days.length === 0 ? (
          <EmptyState
            icon={ListFilterIcon}
            title="No changes match"
            description="Try another place or person, or clear the filters to see every change."
            action={
              isFiltered(filter) && (
                <Button variant="outline" size="sm" onClick={() => onFilterChange(activityFilterOf({}))}>
                  Clear filters
                </Button>
              )
            }
            className="rounded-xl border border-dashed"
          />
        ) : (
          <div className="flex flex-col gap-6">
            {days.map((day, index) => (
              <section key={day.label} aria-labelledby={`activity-day-${index}`} className="flex flex-col gap-1">
                <h2
                  id={`activity-day-${index}`}
                  className="sticky top-12 z-[5] -mx-2 bg-background/90 px-2 py-2 text-xs font-medium text-muted-foreground supports-backdrop-filter:backdrop-blur-md"
                >
                  {day.label}
                </h2>
                <ActivityList
                  scenes={day.scenes}
                  workspaceSlug={workspaceSlug}
                  placeNameOf={(scene) => placeNameOf(scene, collectionNames, userId)}
                  thumbnailSrcOf={thumbnailSrcOf}
                />
              </section>
            ))}
            {matching.length > shownCount && (
              <div className="flex flex-col items-center gap-2 pt-2">
                <p className="text-xs text-muted-foreground tabular-nums">
                  Showing {shownCount} of {matching.length}
                </p>
                <Button variant="outline" size="sm" onClick={() => setShownFor({ key: filterKey, count: shownCount + ACTIVITY_PAGE_SIZE })}>
                  Show more
                </Button>
              </div>
            )}
          </div>
        )}
      </div>
    </WorkspacePage>
  )
}
