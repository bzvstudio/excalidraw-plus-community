import { Link } from '@tanstack/react-router'
import { SceneThumbnail } from '@/components/scenes/scene-card'
import { Avatar } from '@/components/ui/avatar'
import { Skeleton } from '@/components/ui/skeleton'
import { activityTime, editorName } from '@/helpers/activity'
import { sceneLink } from '@/helpers/places'
import { timeAgo } from '@/helpers/time'
import { cn } from '@/lib/utils'
import { avatarImage } from '@/services/avatars/avatars'
import type { SceneListItem } from '@/types/api'

export function ActivityList({
  scenes,
  workspaceSlug,
  placeNameOf,
  thumbnailSrcOf,
  compact = false,
  className,
}: {
  scenes: readonly SceneListItem[]
  workspaceSlug: string
  placeNameOf: (scene: SceneListItem) => string
  thumbnailSrcOf?: (scene: SceneListItem) => string | undefined
  compact?: boolean
  className?: string
}) {
  return (
    <ol className={cn('flex flex-col', className)}>
      {scenes.map((scene) => {
        const changed = new Date(scene.updatedAt)
        return (
          <li
            key={scene.id}
            className="group/row relative -mx-2 flex items-center gap-3 rounded-lg px-2 py-2.5 transition-colors duration-150 hover:bg-muted/60 has-[a:focus-visible]:ring-3 has-[a:focus-visible]:ring-ring motion-reduce:transition-none"
          >
            <Avatar
              name={editorName(scene)}
              seed={scene.updatedBy ?? scene.id}
              image={avatarImage(scene.updatedByAvatarId)}
              size={compact ? 'sm' : 'default'}
            />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm text-muted-foreground">
                <span className="font-medium text-foreground">{editorName(scene)}</span> edited{' '}
                <Link
                  {...sceneLink(workspaceSlug, scene.id)}
                  className="font-medium text-foreground outline-none after:absolute after:inset-0 after:rounded-lg after:content-['']"
                >
                  {scene.title}
                </Link>
              </p>
              <p className="mt-0.5 flex min-w-0 items-center gap-1.5 text-xs text-muted-foreground">
                <span className="truncate">{placeNameOf(scene)}</span>
                <span aria-hidden>·</span>
                <time dateTime={scene.updatedAt} title={changed.toLocaleString()} className="shrink-0 tabular-nums">
                  {compact ? timeAgo(changed) : activityTime(changed)}
                </time>
              </p>
            </div>
            {thumbnailSrcOf && (
              <SceneThumbnail
                src={thumbnailSrcOf(scene)}
                className="w-24 shrink-0 rounded-lg group-hover/row:border-input max-sm:hidden"
              />
            )}
          </li>
        )
      })}
    </ol>
  )
}

export function ActivityListSkeleton({ rows = 5, withThumbnails = false }: { rows?: number; withThumbnails?: boolean }) {
  return (
    <div className="flex flex-col">
      {Array.from({ length: rows }, (_, index) => (
        <div key={index} className="flex items-center gap-3 py-2.5">
          <Skeleton className="size-8 shrink-0 rounded-full" />
          <div className="flex flex-1 flex-col gap-1.5">
            <Skeleton className="h-3.5 w-1/2" />
            <Skeleton className="h-3 w-1/4" />
          </div>
          {withThumbnails && <Skeleton className="aspect-[16/10] w-24 shrink-0 rounded-lg max-sm:hidden" />}
        </div>
      ))}
    </div>
  )
}
