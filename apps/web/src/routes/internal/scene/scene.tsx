import { ArrowLeftIcon } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { getRouteApi, Link, useNavigate, useRouter } from '@tanstack/react-router'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import { SceneTitle } from '@/components/scenes/scene-title'
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbSeparator } from '@/components/ui/breadcrumb'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { buttonVariants } from '@/components/ui/button'
import { placeLink, workspaceLink } from '@/helpers/places'
import { recordVisit } from '@/helpers/recent-visits'
import { messageOf } from '@/helpers/results'
import { canEditScenes } from '@/helpers/roles'
import { rememberedReturn, returnPlace } from '@/helpers/scene-return'
import { visibilityOf } from '@/helpers/visibility'
import { useShell } from '@/hooks/use-shell'
import { useWorkspace } from '@/hooks/use-workspace'
import { sceneFiles } from '@/services/files/files'
import { type LoadedScene, refreshList, renameScene } from '@/services/scenes/scenes'
import { uploadThumbnail } from '@/services/thumbnails/thumbnails'
import { trpc } from '@/trpc'
import { DRAFTS } from '@repo/api/scenes.const'
import { SceneCanvas } from './scene-canvas'
import { ShareButton } from './share-button'

const sceneRoute = getRouteApi('/internal/$slug/scenes/$sceneId')

const NO_COLLECTIONS: { id: string; name: string; teamIds: string[] }[] = []

const SCENE_ROUTE_ID = '/internal/$slug/scenes/$sceneId'

export function SceneRoute() {
  const scene = sceneRoute.useLoaderData()
  return <ScenePage key={scene.id} scene={scene} />
}

function ScenePage({ scene }: { scene: LoadedScene }) {
  const { principal, workspace } = useWorkspace()
  const workspaceId = workspace.id
  const slug = workspace.slug
  const canEdit = canEditScenes(workspace.role)
  const shell = useShell()
  const navigate = useNavigate()
  const ai = useQuery({ ...trpc.ai.options.queryOptions({ workspaceId: workspace.id }), enabled: canEdit })
  const collections = useQuery(trpc.collections.list.queryOptions({ workspaceId })).data ?? NO_COLLECTIONS
  const collection = collections.find(({ id }) => id === scene.collectionId)
  const restricted = (collection?.teamIds.length ?? 0) > 0
  const teams = useQuery({ ...trpc.teams.list.queryOptions({ workspaceId }), enabled: restricted })
  const [title, setTitle] = useState(scene.title)
  const [remembered] = useState(() => rememberedReturn(workspaceId))
  const back = returnPlace({ remembered, slug, collections, sceneCollectionId: scene.collectionId })
  const files = useMemo(() => sceneFiles(workspaceId, scene.id), [workspaceId, scene.id])
  const router = useRouter()
  useEffect(() => recordVisit(principal.userId, workspaceId, scene.id), [principal.userId, workspaceId, scene.id])
  const room = useMemo(() => ({ workspaceId, sceneId: scene.id }), [workspaceId, scene.id])
  const unavailable = useCallback(() => void router.invalidate(), [router])
  const thumbnail = useCallback(
    async (png: Blob) => {
      await uploadThumbnail(workspaceId, scene.id, png)
      await refreshList(workspaceId)
    },
    [workspaceId, scene.id],
  )

  const rename = async (next: string) => {
    const before = title
    setTitle(next)
    try {
      await renameScene(workspaceId, { id: scene.id, title: before }, next)
      await router.invalidate({ filter: (match) => match.routeId === SCENE_ROUTE_ID })
    } catch (error) {
      setTitle(before)
      toast.error('Could not rename the scene', { description: messageOf(error) })
    }
  }

  const visibility = visibilityOf({
    drafts: scene.collectionId === null,
    collection,
    teams: teams.data,
    workspaceName: workspace.name,
  })

  const leading = (
    <>
      <Tooltip>
        <TooltipTrigger
          render={
            <a
              href={back.href}
              aria-label={`Back to ${back.label}`}
              className={buttonVariants({ variant: 'ghost', size: 'icon-sm', className: 'text-muted-foreground hover:text-foreground' })}
              onClick={(event) => {
                if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0) return
                event.preventDefault()
                void navigate({ href: back.href })
              }}
            />
          }
        >
          <ArrowLeftIcon aria-hidden />
        </TooltipTrigger>
        <TooltipContent side="bottom">Back to {back.label}</TooltipContent>
      </Tooltip>
      <span aria-hidden className="h-5 w-px shrink-0 bg-border max-md:hidden" />
      <Breadcrumb className="max-md:hidden">
        <BreadcrumbList>
          <BreadcrumbItem className="max-w-40 max-lg:hidden">
            <BreadcrumbLink render={<Link {...workspaceLink(slug)} />}>{workspace.name}</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator className="max-lg:hidden" />
          <BreadcrumbItem className="max-w-32 lg:max-w-48">
            <BreadcrumbLink render={<Link {...placeLink(slug, scene.collectionId ?? DRAFTS)} />}>
              {scene.collectionId === null ? 'Drafts' : (collection?.name ?? 'Collection')}
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
        </BreadcrumbList>
      </Breadcrumb>
    </>
  )

  return (
    <SceneCanvas
      key={scene.id}
      scene={scene}
      room={room}
      ai={canEdit ? ai.data : undefined}
      readOnly={!canEdit}
      transfer={files}
      onUnavailable={unavailable}
      uploadThumbnail={thumbnail}
      withLibrary
      leading={leading}
      title={<SceneTitle title={title} onRename={canEdit ? (next) => void rename(next) : undefined} />}
      onSearch={shell?.openPalette}
      share={
        canEdit && (
          <ShareButton
            workspaceId={workspaceId}
            sceneId={scene.id}
            title={title}
            sceneUrl={window.location.origin + router.buildLocation({ to: '/$slug/scenes/$sceneId', params: { slug, sceneId: scene.id } }).href}
            visibility={visibility}
            guestEditLinks={workspace.guestEditLinks}
          />
        )
      }
    />
  )
}
