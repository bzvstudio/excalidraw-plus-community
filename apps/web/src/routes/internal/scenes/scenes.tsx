import { useQuery } from '@tanstack/react-query'
import { Link, useNavigate, useParams } from '@tanstack/react-router'
import { COLLECTION_NAME_MAX_LENGTH } from '@repo/api/collections.const'
import { DRAFTS } from '@repo/api/scenes.const'
import {
  ArrowUpDownIcon,
  EllipsisIcon,
  FolderOpenIcon,
  FolderXIcon,
  LayoutGridIcon,
  ListIcon,
  LockIcon,
  PencilIcon,
  PlusIcon,
  Trash2Icon,
  UploadIcon,
  UsersIcon,
} from 'lucide-react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { toast } from 'sonner'
import { NameDialog } from '@/components/name-dialog'
import { AccessDialog } from '@/components/scenes/access-dialog'
import { DeleteCollectionDialog } from '@/components/scenes/delete-collection-dialog'
import { type SceneActions, SceneCard, SceneCardSkeleton } from '@/components/scenes/scene-card'
import { SceneFileInput } from '@/components/scenes/scene-file-input'
import { SceneListHeader, SceneRow, SceneRowSkeleton } from '@/components/scenes/scene-row'
import { VisibilityChip } from '@/components/scenes/visibility-chip'
import { type Visibility, visibilityOf, visibilityText } from '@/helpers/visibility'
import { WorkspacePage } from '@/components/shell/workspace-page'
import { Button, buttonVariants } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { EmptyState } from '@/components/ui/empty-state'
import { PageTitle } from '@/components/ui/page-header'
import { DelayedSkeleton } from '@/components/ui/skeleton'
import { draftOwnerName } from '@/helpers/activity'
import { sceneCountLabel } from '@/helpers/home'
import { othersDrafts, ownDrafts } from '@/helpers/scene-list'
import { sceneLink, workspaceLink } from '@/helpers/places'
import { attempt } from '@/helpers/results'
import { canEditScenes, canManageCollections, canManageWorkspace } from '@/helpers/roles'
import {
  SCENE_SORTS,
  type SceneSort,
  type SceneView,
  sortLabel,
  sortScenes,
  storedSort,
  storedView,
  storeSort,
  storeView,
} from '@/helpers/scene-sort'
import { sceneFilesOf } from '@/helpers/scene-files'
import { useFocusAfterRemoval } from '@/hooks/use-focus-after-removal'
import { useImportScenes } from '@/hooks/use-import-scenes'
import { useSceneActions } from '@/hooks/use-scene-actions'
import { useWorkspace } from '@/hooks/use-workspace'
import { cn } from '@/lib/utils'
import { deleteCollection, renameCollection, restrictCollection } from '@/services/collections/collections'
import { createScene } from '@/services/scenes/scenes'
import { thumbnailUrl } from '@/services/thumbnails/thumbnails'
import { trpc } from '@/trpc'
import type { Collection, SceneListItem } from '@/types/api'

export type CollectionMenu = {
  onRename?: () => void
  onAccess?: () => void
  onDelete?: () => void
}

type CollectionDialog = 'rename' | 'access' | 'delete'

export function DraftsRoute() {
  return <ScenesRoute place={DRAFTS} />
}

export function CollectionScenesRoute() {
  const { collectionId } = useParams({ from: '/internal/$slug/collections/$collectionId' })
  return <ScenesRoute key={collectionId} place={collectionId} />
}

function ScenesRoute({ place }: { place: string }) {
  const navigate = useNavigate()
  const { principal, workspace } = useWorkspace()
  const workspaceId = workspace.id
  const slug = workspace.slug
  const userId = principal.userId
  const isDrafts = place === DRAFTS
  const collections = useQuery(trpc.collections.list.queryOptions({ workspaceId }))
  const scenes = useQuery(trpc.scenes.list.queryOptions({ workspaceId, in: place }))
  const listed = useMemo(
    () => (isDrafts && scenes.data ? ownDrafts(scenes.data, userId) : scenes.data),
    [isDrafts, scenes.data, userId],
  )
  const others = useMemo(
    () => (isDrafts && scenes.data ? othersDrafts(scenes.data, userId) : undefined),
    [isDrafts, scenes.data, userId],
  )
  const collection = collections.data?.find(({ id }) => id === place)
  const restricted = (collection?.teamIds.length ?? 0) > 0
  const isAdmin = canManageWorkspace(workspace.role)
  const teams = useQuery({ ...trpc.teams.list.queryOptions({ workspaceId }), enabled: restricted || isAdmin })
  const [sort, setSort] = useState(() => storedSort(userId))
  const [view, setView] = useState(() => storedView(userId))
  const [dialog, setDialog] = useState<CollectionDialog>()
  const creating = useRef(false)
  const canEdit = canEditScenes(workspace.role)
  const canManage = canManageCollections(workspace.role)
  const collectionId = isDrafts ? undefined : place
  const { importing, importFiles } = useImportScenes({
    workspaceId,
    workspaceSlug: slug,
    collectionId,
    placeName: isDrafts ? 'your drafts' : (collection?.name ?? 'this collection'),
  })
  const { actions, dialog: sceneDialog } = useSceneActions({
    workspaceId,
    workspaceSlug: slug,
    role: workspace.role,
    collections: collections.data,
  })

  const visibility = visibilityOf({ drafts: isDrafts, collection, teams: teams.data, workspaceName: workspace.name })

  const onCreate = useCallback(async () => {
    if (creating.current) return
    creating.current = true
    const result = await attempt(async () => navigate(sceneLink(slug, (await createScene(workspaceId, collectionId)).id)))
    creating.current = false
    if (result.error) toast.error('Could not make a scene', { description: result.error })
  }, [collectionId, navigate, slug, workspaceId])

  const menu: CollectionMenu | undefined =
    collection && (canManage || isAdmin)
      ? {
          onRename: canManage ? () => setDialog('rename') : undefined,
          onAccess: isAdmin ? () => setDialog('access') : undefined,
          onDelete: canManage ? () => setDialog('delete') : undefined,
        }
      : undefined

  return (
    <>
      <ScenesPage
        workspaceSlug={slug}
        workspaceName={workspace.name}
        place={place}
        collections={collections.data}
        visibility={visibility}
        scenes={listed}
        others={others}
        sort={sort}
        view={view}
        canEdit={canEdit}
        importing={importing}
        actions={actions}
        menu={menu}
        thumbnailSrcOf={(scene) =>
          scene.thumbnailUpdatedAt ? thumbnailUrl(workspaceId, scene.id, scene.thumbnailUpdatedAt) : undefined
        }
        onSort={(next) => {
          storeSort(userId, next)
          setSort(next)
        }}
        onView={(next) => {
          storeView(userId, next)
          setView(next)
        }}
        onCreate={() => void onCreate()}
        onImport={(files) => void importFiles(files)}
      />
      {sceneDialog}
      {collection && dialog === 'rename' && (
        <NameDialog
          title="Rename collection"
          label="Collection name"
          initial={collection.name}
          maxLength={COLLECTION_NAME_MAX_LENGTH}
          onClose={() => setDialog(undefined)}
          onSubmit={(name) => attempt(() => renameCollection(workspaceId, collection.id, name))}
        />
      )}
      {collection && dialog === 'access' && teams.data && (
        <AccessDialog
          collection={collection}
          teams={teams.data}
          onClose={() => setDialog(undefined)}
          onSave={(teamIds) => attempt(() => restrictCollection(workspaceId, collection.id, teamIds))}
        />
      )}
      {collection && dialog === 'delete' && (
        <DeleteCollectionDialog
          collection={collection}
          sceneCount={listed?.length}
          onClose={() => setDialog(undefined)}
          onConfirm={() =>
            attempt(async () => {
              await deleteCollection(workspaceId, collection.id, () => navigate(workspaceLink(slug)))
              toast(`Deleted “${collection.name}”`)
            })
          }
        />
      )}
    </>
  )
}

export function ScenesPage({
  workspaceSlug,
  workspaceName,
  place,
  collections,
  visibility,
  scenes,
  others,
  sort,
  view,
  canEdit,
  importing = false,
  actions,
  menu,
  thumbnailSrcOf,
  onSort,
  onView,
  onCreate,
  onImport,
}: {
  workspaceSlug: string
  workspaceName: string
  place: string
  collections: Collection[] | undefined
  visibility: Visibility | undefined
  scenes: SceneListItem[] | undefined
  others?: SceneListItem[]
  sort: SceneSort
  view: SceneView
  canEdit: boolean
  importing?: boolean
  actions: SceneActions
  menu?: CollectionMenu
  thumbnailSrcOf: (scene: SceneListItem) => string | undefined
  onSort: (sort: SceneSort) => void
  onView: (view: SceneView) => void
  onCreate: () => void
  onImport: (files: File[]) => void
}) {
  const [dragDepth, setDragDepth] = useState(0)
  const fileInput = useRef<HTMLInputElement>(null)
  const isDrafts = place === DRAFTS
  const collection = collections?.find((option) => option.id === place)
  const missing = !isDrafts && collections !== undefined && !collection
  const heading = isDrafts ? 'Drafts' : missing ? 'Collection not found' : (collection?.name ?? 'Collection')
  const sorted = useMemo(() => (scenes ? sortScenes(scenes, sort) : undefined), [scenes, sort])
  const sortedOthers = useMemo(() => (others ? sortScenes(others, sort) : undefined), [others, sort])
  const container = useRef<HTMLElement>(null)
  const shownIds = useMemo(
    () => [...(sorted ?? []), ...(sortedOthers ?? [])].map(({ id }) => id),
    [sorted, sortedOthers],
  )
  useFocusAfterRemoval(container, shownIds)
  const empty = sorted?.length === 0
  const canImport = canEdit && !missing

  const accepts = (event: React.DragEvent) =>
    canImport && !importing && event.dataTransfer.types.includes('Files') && event.currentTarget.contains(event.target as Node)
  const dropHandlers = {
    onDragEnter: (event: React.DragEvent) => accepts(event) && setDragDepth((depth) => depth + 1),
    onDragLeave: (event: React.DragEvent) => accepts(event) && setDragDepth((depth) => Math.max(0, depth - 1)),
    onDragOver: (event: React.DragEvent) => accepts(event) && event.preventDefault(),
    onDrop: (event: React.DragEvent) => {
      setDragDepth(0)
      if (!accepts(event)) return
      event.preventDefault()
      const files = sceneFilesOf(event.dataTransfer.files)
      if (files.length > 0) onImport(files)
    },
  }

  useEffect(() => {
    const keepFileInPage = (event: DragEvent) => {
      if (event.dataTransfer?.types.includes('Files')) event.preventDefault()
    }
    window.addEventListener('dragover', keepFileInPage)
    window.addEventListener('drop', keepFileInPage)
    return () => {
      window.removeEventListener('dragover', keepFileInPage)
      window.removeEventListener('drop', keepFileInPage)
    }
  }, [])

  const pickFiles = () => fileInput.current?.click()

  return (
    <WorkspacePage
      crumbs={[{ label: workspaceName, link: workspaceLink(workspaceSlug) }, { label: heading }]}
      actions={
        (canImport || menu) && (
          <>
            {canImport && (
              <>
                <Button variant="outline" size="sm" disabled={importing} onClick={pickFiles} className="max-sm:px-2">
                  <UploadIcon aria-hidden />
                  <span className="max-sm:sr-only">{importing ? 'Importing…' : 'Import'}</span>
                </Button>
                <Button size="sm" onClick={onCreate} className="max-sm:px-2">
                  <PlusIcon aria-hidden />
                  <span className="max-sm:sr-only">New scene</span>
                </Button>
              </>
            )}
            {menu && <CollectionMenuButton menu={menu} />}
          </>
        )
      }
    >
      {canImport && (
        <SceneFileInput ref={fileInput} onFiles={onImport} />
      )}
      <section
        ref={container}
        aria-labelledby="place-heading"
        className={cn(
          'flex flex-1 flex-col gap-6 rounded-xl',
          dragDepth > 0 && 'outline-2 outline-offset-8 outline-ring outline-dashed',
        )}
        {...dropHandlers}
      >
        <header className="flex min-w-0 flex-col gap-1.5">
          <div className="flex min-w-0 items-center gap-2.5">
            <PageTitle id="place-heading" tabIndex={-1} data-focus-fallback className="text-xl outline-none">
              {heading}
            </PageTitle>
            {visibility && <VisibilityChip visibility={visibility} onChange={menu?.onAccess} />}
          </div>
          {visibility && <p className="text-sm text-pretty text-muted-foreground">{visibilityText(visibility).detail}</p>}
        </header>

        {missing ? (
          <EmptyState
            icon={FolderXIcon}
            title="This collection isn’t here"
            description="It may have been deleted, or the link has a typo. Its scenes, if any were left, are still in the workspace."
            action={
              <Link {...workspaceLink(workspaceSlug)} className={buttonVariants({ variant: 'outline', size: 'sm' })}>
                Back to home
              </Link>
            }
            className="rounded-xl border border-dashed"
          />
        ) : empty ? (
          <EmptyPlace isDrafts={isDrafts} canEdit={canEdit} importing={importing} onCreate={onCreate} onImport={pickFiles} />
        ) : (
          <div className="flex flex-col gap-4">
            <Toolbar count={sorted?.length} sort={sort} view={view} onSort={onSort} onView={onView} />
            {!sorted ? (
              <DelayedSkeleton label="Loading scenes">
                {view === 'grid' ? (
                  <SceneGrid>
                    {Array.from({ length: 8 }, (_, index) => (
                      <li key={index}>
                        <SceneCardSkeleton />
                      </li>
                    ))}
                  </SceneGrid>
                ) : (
                  <SceneList>
                    {Array.from({ length: 6 }, (_, index) => (
                      <li key={index}>
                        <SceneRowSkeleton />
                      </li>
                    ))}
                  </SceneList>
                )}
              </DelayedSkeleton>
            ) : (
              <ScenesView scenes={sorted} view={view} workspaceSlug={workspaceSlug} actions={actions} thumbnailSrcOf={thumbnailSrcOf} />
            )}
          </div>
        )}
        {sortedOthers && sortedOthers.length > 0 && (
          <section aria-labelledby="others-drafts" className="flex flex-col gap-4 border-t pt-6">
            <div className="flex flex-col gap-1">
              <h2 id="others-drafts" className="text-sm font-semibold text-foreground">
                Others’ drafts
              </h2>
              <p className="text-sm text-pretty text-muted-foreground">
                Drafts by other members, and by people who have left. Only admins see these, so nothing is stranded.
              </p>
            </div>
            <ScenesView
              scenes={sortedOthers}
              view={view}
              workspaceSlug={workspaceSlug}
              actions={actions}
              thumbnailSrcOf={thumbnailSrcOf}
              placeNameOf={draftOwnerName}
            />
          </section>
        )}
      </section>
    </WorkspacePage>
  )
}

function ScenesView({
  scenes,
  view,
  workspaceSlug,
  actions,
  thumbnailSrcOf,
  placeNameOf,
}: {
  scenes: SceneListItem[]
  view: SceneView
  workspaceSlug: string
  actions: SceneActions
  thumbnailSrcOf: (scene: SceneListItem) => string | undefined
  placeNameOf?: (scene: SceneListItem) => string
}) {
  if (view === 'list') {
    return (
      <SceneList>
        {scenes.map((scene) => (
          <li key={scene.id} data-scene-id={scene.id}>
            <SceneRow
              scene={scene}
              workspaceSlug={workspaceSlug}
              thumbnailSrc={thumbnailSrcOf(scene)}
              placeName={placeNameOf?.(scene)}
              actions={actions}
            />
          </li>
        ))}
      </SceneList>
    )
  }
  return (
    <SceneGrid>
      {scenes.map((scene) => (
        <li key={scene.id} data-scene-id={scene.id}>
          <SceneCard
            scene={scene}
            workspaceSlug={workspaceSlug}
            thumbnailSrc={thumbnailSrcOf(scene)}
            placeName={placeNameOf?.(scene)}
            actions={actions}
          />
        </li>
      ))}
    </SceneGrid>
  )
}

function SceneGrid({ children }: { children: React.ReactNode }) {
  return <ul className="grid grid-cols-2 gap-x-4 gap-y-6 md:grid-cols-3 xl:grid-cols-4">{children}</ul>
}

function SceneList({ children }: { children: React.ReactNode }) {
  return (
    <div className="overflow-hidden rounded-xl border">
      <SceneListHeader />
      <ul className="divide-y">{children}</ul>
    </div>
  )
}

function Toolbar({
  count,
  sort,
  view,
  onSort,
  onView,
}: {
  count: number | undefined
  sort: SceneSort
  view: SceneView
  onSort: (sort: SceneSort) => void
  onView: (view: SceneView) => void
}) {
  return (
    <div className="flex h-8 items-center justify-between gap-3">
      <p className="text-sm text-muted-foreground tabular-nums">{count !== undefined && sceneCountLabel(count)}</p>
      <div className="flex items-center gap-2">
        <DropdownMenu>
          <DropdownMenuTrigger
            aria-label={`Sort: ${sortLabel(sort)}`}
            className={buttonVariants({ variant: 'ghost', size: 'sm', className: 'text-muted-foreground' })}
          >
            <ArrowUpDownIcon aria-hidden />
            {sortLabel(sort)}
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="min-w-40">
            <DropdownMenuRadioGroup value={sort} onValueChange={(value) => onSort(value as SceneSort)}>
              <DropdownMenuLabel>Sort by</DropdownMenuLabel>
              {SCENE_SORTS.map(({ value, label }) => (
                <DropdownMenuRadioItem key={value} value={value} closeOnClick>
                  {label}
                </DropdownMenuRadioItem>
              ))}
            </DropdownMenuRadioGroup>
          </DropdownMenuContent>
        </DropdownMenu>
        <div role="group" aria-label="View" className="flex items-center gap-0.5 rounded-lg border p-0.5">
          <ViewButton label="Grid" icon={LayoutGridIcon} pressed={view === 'grid'} onClick={() => onView('grid')} />
          <ViewButton label="List" icon={ListIcon} pressed={view === 'list'} onClick={() => onView('list')} />
        </div>
      </div>
    </div>
  )
}

function ViewButton({
  label,
  icon: Icon,
  pressed,
  onClick,
}: {
  label: string
  icon: React.ComponentType<{ className?: string; 'aria-hidden'?: boolean }>
  pressed: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      aria-pressed={pressed}
      aria-label={label}
      title={label}
      onClick={onClick}
      className={cn(
        'flex size-7 items-center justify-center rounded-md text-muted-foreground transition-colors duration-150 outline-none hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring motion-reduce:transition-none',
        pressed && 'bg-muted text-foreground',
      )}
    >
      <Icon aria-hidden className="size-4" />
    </button>
  )
}

function CollectionMenuButton({ menu }: { menu: CollectionMenu }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label="Collection actions"
        className={buttonVariants({ variant: 'ghost', size: 'icon-sm' })}
      >
        <EllipsisIcon aria-hidden />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-48">
        {menu.onRename && (
          <DropdownMenuItem onClick={menu.onRename}>
            <PencilIcon aria-hidden />
            Rename…
          </DropdownMenuItem>
        )}
        {menu.onAccess && (
          <DropdownMenuItem onClick={menu.onAccess}>
            <UsersIcon aria-hidden />
            Who can see this…
          </DropdownMenuItem>
        )}
        {menu.onDelete && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem variant="destructive" onClick={menu.onDelete}>
              <Trash2Icon aria-hidden />
              Delete collection…
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

function EmptyPlace({
  isDrafts,
  canEdit,
  importing,
  onCreate,
  onImport,
}: {
  isDrafts: boolean
  canEdit: boolean
  importing: boolean
  onCreate: () => void
  onImport: () => void
}) {
  const actions = canEdit && (
    <div className="flex flex-wrap justify-center gap-2">
      <Button size="sm" onClick={onCreate}>
        <PlusIcon aria-hidden />
        New scene
      </Button>
      <Button size="sm" variant="outline" disabled={importing} onClick={onImport}>
        <UploadIcon aria-hidden />
        {importing ? 'Importing…' : 'Import a file'}
      </Button>
    </div>
  )

  return (
    <EmptyState
      icon={isDrafts ? LockIcon : FolderOpenIcon}
      title={isDrafts ? 'No drafts' : canEdit ? 'Nothing in this collection yet' : 'No scenes here yet'}
      description={
        isDrafts
          ? 'New scenes start here, out of sight of everyone but you and the admins. Move one into a collection when it is ready to share.'
          : canEdit
            ? 'Start a scene here, or drop .excalidraw files onto this page to bring them in.'
            : 'When someone adds a scene to this collection, it will show up here.'
      }
      action={actions || undefined}
      className="rounded-xl border border-dashed py-16"
    />
  )
}
