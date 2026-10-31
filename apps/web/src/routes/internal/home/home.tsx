import { useQuery } from '@tanstack/react-query'
import { Link, useNavigate } from '@tanstack/react-router'
import { COLLECTION_NAME_MAX_LENGTH } from '@repo/api/collections.const'
import { ArrowRightIcon, EyeIcon } from 'lucide-react'
import { type ReactNode, useMemo, useRef, useState } from 'react'
import { toast } from 'sonner'
import { ActivityList, ActivityListSkeleton } from '@/components/activity/activity-list'
import { CollectionTiles, CollectionTilesSkeleton } from '@/components/home/collection-tiles'
import { GetStarted, type HomeActions, QuickActions } from '@/components/home/quick-actions'
import { NameDialog } from '@/components/name-dialog'
import { type SceneActions, SceneCard, SceneCardSkeleton } from '@/components/scenes/scene-card'
import { SceneFileInput } from '@/components/scenes/scene-file-input'
import { WorkspacePage } from '@/components/shell/workspace-page'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/ui/empty-state'
import { DelayedSkeleton } from '@/components/ui/skeleton'
import { PageTitle } from '@/components/ui/page-header'
import { InviteLinkDialog } from '@/components/workspaces/invite-dialogs'
import { placeNameOf } from '@/helpers/activity'
import { COLLECTIONS_SHOWN, RECENT_CHANGES_LIMIT } from '@/constants/home'
import {
  collectionSummaries,
  countLabel,
  draftsSummary,
  greeting,
  jumpBackIn,
  sceneCountLabel,
  yourSceneCount,
} from '@/helpers/home'
import { activityLink, placeLink, sceneLink, workspaceLink } from '@/helpers/places'
import { type RecentVisit, recentVisits } from '@/helpers/recent-visits'
import { attempt } from '@/helpers/results'
import { canEditScenes, canManageCollections, canManageWorkspace } from '@/helpers/roles'
import { useImportScenes } from '@/hooks/use-import-scenes'
import { useSceneActions } from '@/hooks/use-scene-actions'
import { useWorkspace } from '@/hooks/use-workspace'
import { createCollection } from '@/services/collections/collections'
import { createScene } from '@/services/scenes/scenes'
import { thumbnailUrl } from '@/services/thumbnails/thumbnails'
import { requestInviteLink } from '@/services/workspaces/workspaces'
import { trpc } from '@/trpc'
import type { Collection, SceneListItem } from '@/types/api'

type RouteActions = Omit<HomeActions, 'onImport'>

type Dialog = { kind: 'invite' } | { kind: 'collection' }

export function HomeRoute() {
  const navigate = useNavigate()
  const { principal, workspace } = useWorkspace()
  const workspaceId = workspace.id
  const slug = workspace.slug
  const scenes = useQuery(trpc.scenes.list.queryOptions({ workspaceId }))
  const collections = useQuery(trpc.collections.list.queryOptions({ workspaceId }))
  const [visits] = useState(() => recentVisits(principal.userId, workspaceId))
  const [dialog, setDialog] = useState<Dialog>()
  const creating = useRef(false)
  const canEdit = canEditScenes(workspace.role)
  const canManage = canManageWorkspace(workspace.role)

  const report = async (run: () => Promise<unknown>) => {
    const { error } = await attempt(run)
    if (error) toast.error(error)
  }

  const { importing, importFiles } = useImportScenes({ workspaceId, workspaceSlug: slug, placeName: 'your drafts' })
  const { actions: sceneActions, dialog: sceneDialog } = useSceneActions({
    workspaceId,
    workspaceSlug: slug,
    role: workspace.role,
    collections: collections.data,
  })

  const actions: RouteActions | undefined = canEdit
    ? {
        importing,
        onCreate: async () => {
          if (creating.current) return
          creating.current = true
          await report(async () => navigate(sceneLink(slug, (await createScene(workspaceId)).id)))
          creating.current = false
        },
        onNewCollection: canManageCollections(workspace.role) ? () => setDialog({ kind: 'collection' }) : undefined,
        onInvite: canManage ? () => setDialog({ kind: 'invite' }) : undefined,
      }
    : undefined

  return (
    <>
      <HomePage
        workspaceSlug={slug}
        workspaceName={workspace.name}
        userId={principal.userId}
        userName={principal.name}
        scenes={scenes.data}
        collections={collections.data}
        visits={visits}
        actions={actions}
        sceneActions={sceneActions}
        thumbnailSrcOf={(scene) =>
          scene.thumbnailUpdatedAt ? thumbnailUrl(workspaceId, scene.id, scene.thumbnailUpdatedAt) : undefined
        }
        onImportFiles={(files) => void importFiles(files)}
      />
      {dialog?.kind === 'invite' && (
        <InviteLinkDialog
          onClose={() => setDialog(undefined)}
          onCreate={(role, maxUses) => requestInviteLink(workspaceId, role, maxUses)}
        />
      )}
      {dialog?.kind === 'collection' && (
        <NameDialog
          title="New collection"
          label="Collection name"
          submitLabel="Create collection"
          maxLength={COLLECTION_NAME_MAX_LENGTH}
          onClose={() => setDialog(undefined)}
          onSubmit={(name) =>
            attempt(async () => {
              const collection = await createCollection(workspaceId, name)
              await navigate(placeLink(slug, collection.id))
            })
          }
        />
      )}
      {sceneDialog}
    </>
  )
}

function Section({
  id,
  title,
  aside,
  children,
}: {
  id: string
  title: string
  aside?: ReactNode
  children: ReactNode
}) {
  return (
    <section aria-labelledby={id} className="flex min-w-0 flex-col gap-3">
      <div className="flex h-7 items-center justify-between gap-4">
        <h2 id={id} className="text-sm font-semibold text-foreground">
          {title}
        </h2>
        {aside}
      </div>
      {children}
    </section>
  )
}

function Hint({ children }: { children: ReactNode }) {
  return <p className="rounded-xl border border-dashed px-4 py-6 text-center text-sm text-pretty text-muted-foreground">{children}</p>
}

export function HomePage({
  workspaceSlug,
  workspaceName,
  userId,
  userName,
  scenes,
  collections,
  visits,
  actions,
  sceneActions,
  thumbnailSrcOf,
  onImportFiles,
  now,
}: {
  workspaceSlug: string
  workspaceName: string
  userId: string
  userName: string
  scenes: SceneListItem[] | undefined
  collections: Collection[] | undefined
  visits: readonly RecentVisit[]
  actions?: RouteActions
  sceneActions?: SceneActions
  thumbnailSrcOf: (scene: SceneListItem) => string | undefined
  onImportFiles: (files: File[]) => void
  now?: Date
}) {
  const [fileInput, setFileInput] = useState<HTMLInputElement | null>(null)
  const [showAllCollections, setShowAllCollections] = useState(false)
  const [hello] = useState(() => greeting(userName, now))
  const collectionNames = useMemo(() => new Map((collections ?? []).map(({ id, name }) => [id, name])), [collections])
  const loaded = scenes !== undefined && collections !== undefined
  const all = scenes ?? []
  const empty = loaded && all.length === 0
  const recent = useMemo(() => jumpBackIn(scenes ?? [], visits, userId), [scenes, visits, userId])
  const summaries = useMemo(() => collectionSummaries(collections ?? [], scenes ?? []), [collections, scenes])
  const canCreate = actions !== undefined
  const drafts = useMemo(() => (canCreate ? draftsSummary(scenes ?? [], userId) : undefined), [canCreate, scenes, userId])
  const sceneCount = useMemo(() => yourSceneCount(scenes ?? [], userId), [scenes, userId])
  const shownCollections = showAllCollections ? summaries : summaries.slice(0, COLLECTIONS_SHOWN)
  const placeName = (scene: SceneListItem) => placeNameOf(scene, collectionNames, userId)
  const withImport: HomeActions | undefined = actions && { ...actions, onImport: () => fileInput?.click() }

  return (
    <WorkspacePage crumbs={[{ label: workspaceName, link: workspaceLink(workspaceSlug) }, { label: 'Home' }]}>
      <div className="flex flex-col gap-10">
        <header className="flex flex-col gap-1">
          <PageTitle className="text-xl">{hello}</PageTitle>
          <p className="text-sm text-muted-foreground">
            {loaded && !empty
              ? `${workspaceName} · ${sceneCountLabel(sceneCount)} · ${countLabel(collections.length, 'collection', 'collections')}`
              : loaded && actions
                ? `${workspaceName} is ready. Here is how to make it yours.`
                : workspaceName}
          </p>
        </header>

        {withImport && (
          <SceneFileInput ref={setFileInput} onFiles={onImportFiles} />
        )}

        {!loaded ? (
          <DelayedSkeleton label="Loading your workspace" className="flex flex-col gap-10">
            <div className="flex flex-col gap-3">
              <div className="h-7" />
              <div className="grid grid-cols-2 gap-x-4 gap-y-6 lg:grid-cols-4">
                {Array.from({ length: 4 }, (_, index) => (
                  <SceneCardSkeleton key={index} withPlace />
                ))}
              </div>
            </div>
            <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,22rem)]">
              <CollectionTilesSkeleton />
              <ActivityListSkeleton />
            </div>
          </DelayedSkeleton>
        ) : empty ? (
          withImport ? (
            <GetStarted actions={withImport} hasCollections={collections.length > 0} />
          ) : (
            <EmptyState
              icon={EyeIcon}
              title="Nothing to look at yet"
              description="You can open and comment on scenes here. When someone puts a scene in a collection you can see, it shows up on this page."
              className="rounded-xl border border-dashed"
            />
          )
        ) : (
          <>
            {withImport && <QuickActions actions={withImport} />}
            <Section id="jump-back-in" title="Jump back in">
              {recent.length > 0 ? (
                <ul className="grid grid-cols-2 gap-x-4 gap-y-6 lg:grid-cols-4">
                  {recent.map((scene) => (
                    <li key={scene.id}>
                      <SceneCard
                        scene={scene}
                        workspaceSlug={workspaceSlug}
                        thumbnailSrc={thumbnailSrcOf(scene)}
                        placeName={placeName(scene)}
                        actions={sceneActions}
                      />
                    </li>
                  ))}
                </ul>
              ) : (
                <Hint>
                  {actions
                    ? 'Scenes you open or edit will gather here, so you can pick up where you left off.'
                    : 'Scenes you open will gather here, so you can find them again quickly.'}
                </Hint>
              )}
            </Section>
            <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,22rem)]">
              <Section
                id="collections"
                title="Collections"
                aside={
                  summaries.length > COLLECTIONS_SHOWN && (
                    <Button variant="ghost" size="xs" className="text-muted-foreground" onClick={() => setShowAllCollections((shown) => !shown)}>
                      {showAllCollections ? 'Show fewer' : `Show all ${summaries.length}`}
                    </Button>
                  )
                }
              >
                {summaries.length > 0 || drafts ? (
                  <CollectionTiles workspaceSlug={workspaceSlug} drafts={drafts} collections={shownCollections} />
                ) : null}
                {summaries.length === 0 && (
                  <Hint>
                    {actions?.onNewCollection ? (
                      <>
                        No collections yet. A collection shares its scenes with the whole workspace.{' '}
                        <button type="button" onClick={actions.onNewCollection} className="font-medium text-foreground underline decoration-foreground/30 underline-offset-4 hover:decoration-foreground">
                          Make the first one
                        </button>
                      </>
                    ) : (
                      'No collections yet. When someone makes one, it appears here.'
                    )}
                  </Hint>
                )}
              </Section>
              <Section
                id="recent-changes"
                title="Recent changes"
                aside={
                  <Link
                    {...activityLink(workspaceSlug)}
                    className="flex items-center gap-1 rounded-md text-xs font-medium text-muted-foreground transition-colors duration-150 outline-none hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring motion-reduce:transition-none"
                  >
                    All activity
                    <ArrowRightIcon aria-hidden className="size-3.5" />
                  </Link>
                }
              >
                <ActivityList compact scenes={all.slice(0, RECENT_CHANGES_LIMIT)} workspaceSlug={workspaceSlug} placeNameOf={placeName} />
              </Section>
            </div>
          </>
        )}
      </div>
    </WorkspacePage>
  )
}
