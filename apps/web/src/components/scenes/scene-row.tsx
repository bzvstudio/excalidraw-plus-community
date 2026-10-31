import { Link } from '@tanstack/react-router'
import { Avatar } from '@/components/ui/avatar'
import { Skeleton } from '@/components/ui/skeleton'
import { sceneLink } from '@/helpers/places'
import { timeAgo } from '@/helpers/time'
import { cn } from '@/lib/utils'
import { avatarImage } from '@/services/avatars/avatars'
import type { SceneListItem } from '@/types/api'
import { type SceneActions, SceneMenu, SceneThumbnail } from './scene-card'

const COLUMNS = 'grid grid-cols-[5rem_minmax(0,1fr)_auto] items-center gap-x-3 sm:grid-cols-[5rem_minmax(0,1fr)_7.5rem_auto] md:grid-cols-[5rem_minmax(0,1fr)_11rem_7.5rem_auto]'

export function SceneListHeader() {
  return (
    <div aria-hidden className={`${COLUMNS} h-9 border-b px-3 text-xs font-medium text-muted-foreground max-sm:hidden`}>
      <span />
      <span>Name</span>
      <span className="max-md:hidden">Last edited by</span>
      <span>Edited</span>
      <span className="w-8" />
    </div>
  )
}

export function SceneRow({
  scene,
  workspaceSlug,
  thumbnailSrc,
  placeName,
  actions,
}: {
  scene: SceneListItem
  workspaceSlug: string
  thumbnailSrc?: string
  placeName?: string
  actions: SceneActions
}) {
  const edited = timeAgo(new Date(scene.updatedAt))

  return (
    <article
      className={`group/card relative ${COLUMNS} px-3 py-2 transition-colors duration-150 hover:bg-muted/50 has-[a:focus-visible]:bg-muted/50 has-[a:focus-visible]:ring-3 has-[a:focus-visible]:ring-ring has-[a:focus-visible]:ring-inset has-[[aria-expanded=true]]:bg-muted/50 motion-reduce:transition-none`}
    >
      <SceneThumbnail src={thumbnailSrc} compact className="rounded-md group-hover/card:border-input" />
      <div className="min-w-0">
        <h3 className="truncate text-sm font-medium text-foreground">
          <Link
            {...sceneLink(workspaceSlug, scene.id)}
            className="outline-none after:absolute after:inset-0 after:content-['']"
          >
            {scene.title}
          </Link>
        </h3>
        <p className={cn('mt-0.5 flex min-w-0 items-center gap-1.5 text-xs text-muted-foreground', !placeName && 'sm:hidden')}>
          {placeName && <span className="truncate">{placeName}</span>}
          {placeName && (
            <span aria-hidden className="sm:hidden">
              ·
            </span>
          )}
          <span className="shrink-0 tabular-nums sm:hidden">
            <span className="sr-only">Edited </span>
            {edited}
          </span>
        </p>
      </div>
      <div className="flex min-w-0 items-center gap-2 text-sm text-muted-foreground max-md:hidden">
        {scene.updatedBy && scene.updatedByName ? (
          <>
            <Avatar name={scene.updatedByName} seed={scene.updatedBy} image={avatarImage(scene.updatedByAvatarId)} size="xs" />
            <span className="truncate">
              <span className="sr-only">Last edited by </span>
              {scene.updatedByName}
            </span>
          </>
        ) : (
          <span>Someone</span>
        )}
      </div>
      <span className="text-xs text-muted-foreground tabular-nums max-sm:hidden">
        <span className="sr-only">Edited </span>
        {edited}
      </span>
      <div className="relative z-10 opacity-0 transition-opacity duration-150 group-hover/card:opacity-100 focus-within:opacity-100 has-[[aria-expanded=true]]:opacity-100 motion-reduce:transition-none [@media(hover:none)]:opacity-100">
        <SceneMenu scene={scene} workspaceSlug={workspaceSlug} actions={actions} className="bg-transparent" />
      </div>
    </article>
  )
}

export function SceneRowSkeleton() {
  return (
    <div className={`${COLUMNS} px-3 py-2`}>
      <Skeleton className="aspect-[16/10] rounded-md" />
      <div className="flex flex-col gap-1.5">
        <Skeleton className="h-3.5 w-2/5" />
      </div>
      <Skeleton className="h-3 w-24 max-md:hidden" />
      <Skeleton className="h-3 w-16 max-sm:hidden" />
      <span className="w-8" />
    </div>
  )
}
