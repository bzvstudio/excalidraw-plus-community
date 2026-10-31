import { Link } from '@tanstack/react-router'
import {
  ArrowUpRightIcon,
  ExternalLinkIcon,
  FolderIcon,
  FolderInputIcon,
  LinkIcon,
  LockIcon,
  MoreHorizontalIcon,
  PencilIcon,
  ShapesIcon,
  Trash2Icon,
} from 'lucide-react'
import { Avatar } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Skeleton } from '@/components/ui/skeleton'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { sceneLink } from '@/helpers/places'
import { timeAgo } from '@/helpers/time'
import { cn } from '@/lib/utils'
import { avatarImage } from '@/services/avatars/avatars'
import type { Collection, SceneListItem } from '@/types/api'

export type SceneEditActions = {
  collections: Collection[]
  canMoveOutOfRestricted: boolean
  onRename: (scene: SceneListItem) => void
  onMove: (scene: SceneListItem, collectionId: string | null) => void
  onDelete: (scene: SceneListItem) => void
}

export type SceneActions = {
  onCopyLink: (scene: SceneListItem) => void
  edit?: SceneEditActions
}

export function SceneThumbnail({
  src,
  className,
  zoom = false,
  compact = false,
}: {
  src?: string
  className?: string
  zoom?: boolean
  compact?: boolean
}) {
  return (
    <span
      className={cn(
        'relative block aspect-[16/10] overflow-hidden rounded-xl border bg-background transition-colors duration-150 motion-reduce:transition-none',
        className,
      )}
    >
      {src ? (
        <img
          src={src}
          alt=""
          loading="lazy"
          decoding="async"
          className={cn(
            'size-full object-contain dark:[filter:invert(93%)_hue-rotate(180deg)]',
            compact ? 'p-1' : 'p-3',
            zoom && 'transition-transform duration-200 group-hover/card:scale-[1.02] motion-reduce:transition-none motion-reduce:group-hover/card:scale-100',
          )}
        />
      ) : (
        <span
          data-slot="thumbnail-placeholder"
          className={cn(
            'grid size-full place-items-center bg-muted/40 bg-[radial-gradient(color-mix(in_oklch,var(--foreground)_14%,transparent)_1px,transparent_1px)] bg-center text-muted-foreground/60',
            compact ? 'bg-size-[8px_8px]' : 'bg-size-[14px_14px]',
          )}
        >
          {compact ? (
            <ShapesIcon aria-hidden className="size-3.5 text-muted-foreground/70" />
          ) : (
            <span className="flex size-9 items-center justify-center rounded-lg border bg-background text-muted-foreground shadow-xs">
              <ShapesIcon aria-hidden className="size-4" />
            </span>
          )}
        </span>
      )}
    </span>
  )
}

export function SceneCard({
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
  actions?: SceneActions
}) {
  const edited = timeAgo(new Date(scene.updatedAt))

  return (
    <article className="group/card relative flex flex-col gap-2.5 rounded-xl has-[a:focus-visible]:ring-3 has-[a:focus-visible]:ring-ring has-[a:focus-visible]:ring-offset-4 has-[a:focus-visible]:ring-offset-background">
      <SceneThumbnail
        src={thumbnailSrc}
        zoom
        className="group-hover/card:border-input group-has-[[aria-expanded=true]]/card:border-input"
      />
      <div className="flex min-w-0 items-start gap-2 px-0.5">
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-sm font-medium text-foreground">
            <Link
              {...sceneLink(workspaceSlug, scene.id)}
              className="outline-none after:absolute after:inset-0 after:rounded-xl after:content-['']"
            >
              {scene.title}
            </Link>
          </h3>
          <p className="mt-0.5 flex min-w-0 items-center gap-1.5 text-xs text-muted-foreground max-sm:flex-col max-sm:items-start max-sm:gap-0.5">
            {placeName && (
              <>
                <span className="max-w-full truncate">{placeName}</span>
                <span aria-hidden className="max-sm:hidden">
                  ·
                </span>
              </>
            )}
            <span className="shrink-0 tabular-nums">
              <span className="sr-only">Edited </span>
              {edited}
            </span>
          </p>
        </div>
        {scene.updatedBy && scene.updatedByName && (
          <Tooltip>
            <TooltipTrigger render={<span />} className="relative z-10 mt-0.5 shrink-0">
              <Avatar name={scene.updatedByName} seed={scene.updatedBy} image={avatarImage(scene.updatedByAvatarId)} size="xs" />
              <span className="sr-only">Last edited by {scene.updatedByName}</span>
            </TooltipTrigger>
            <TooltipContent aria-hidden>Last edited by {scene.updatedByName}</TooltipContent>
          </Tooltip>
        )}
      </div>
      {actions && (
        <div className="absolute top-2 right-2 z-10 opacity-0 transition-opacity duration-150 group-hover/card:opacity-100 focus-within:opacity-100 has-[[aria-expanded=true]]:opacity-100 motion-reduce:transition-none [@media(hover:none)]:opacity-100">
          <SceneMenu scene={scene} workspaceSlug={workspaceSlug} actions={actions} />
        </div>
      )}
    </article>
  )
}

export function SceneCardSkeleton({ withPlace = false }: { withPlace?: boolean }) {
  return (
    <div className="flex flex-col gap-2.5">
      <Skeleton className="aspect-[16/10] rounded-xl" />
      <div className="flex flex-col gap-1.5 px-0.5 py-0.5">
        <Skeleton className="h-3.5 w-3/5" />
        <Skeleton className={cn('h-3', withPlace ? 'w-2/5' : 'w-1/4')} />
      </div>
    </div>
  )
}

export function SceneMenu({
  scene,
  workspaceSlug,
  actions,
  className,
}: {
  scene: SceneListItem
  workspaceSlug: string
  actions: SceneActions
  className?: string
}) {
  const edit = actions.edit
  const restricted =
    edit?.collections.some((collection) => collection.id === scene.collectionId && collection.teamIds.length > 0) ?? false
  const destinations =
    !edit || (restricted && !edit.canMoveOutOfRestricted)
      ? []
      : [...(scene.canDelete ? [{ id: null, name: 'Drafts' }] : []), ...edit.collections].filter(
          (destination) => destination.id !== scene.collectionId,
        )

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            variant="outline"
            size="icon-sm"
            className={cn('bg-background/90 supports-backdrop-filter:backdrop-blur-sm', className)}
            aria-label={`Actions for ${scene.title}`}
          />
        }
      >
        <MoreHorizontalIcon aria-hidden />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-44">
        <DropdownMenuItem render={<Link {...sceneLink(workspaceSlug, scene.id)} />}>
          <ArrowUpRightIcon aria-hidden />
          Open
        </DropdownMenuItem>
        <DropdownMenuItem render={<Link {...sceneLink(workspaceSlug, scene.id)} target="_blank" rel="noopener" />}>
          <ExternalLinkIcon aria-hidden />
          Open in new tab
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => actions.onCopyLink(scene)}>
          <LinkIcon aria-hidden />
          Copy link
        </DropdownMenuItem>
        {edit && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => edit.onRename(scene)}>
              <PencilIcon aria-hidden />
              Rename…
            </DropdownMenuItem>
            {destinations.length > 0 && (
              <DropdownMenuSub>
                <DropdownMenuSubTrigger>
                  <FolderInputIcon aria-hidden />
                  Move to…
                </DropdownMenuSubTrigger>
                <DropdownMenuSubContent className="max-h-72 overflow-y-auto">
                  {destinations.map((destination) => (
                    <DropdownMenuItem key={destination.id ?? 'drafts'} onClick={() => edit.onMove(scene, destination.id)}>
                      {destination.id === null ? <LockIcon aria-hidden /> : <FolderIcon aria-hidden />}
                      <span className="truncate">{destination.name}</span>
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuSubContent>
              </DropdownMenuSub>
            )}
            {scene.canDelete && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem variant="destructive" onClick={() => edit.onDelete(scene)}>
                  <Trash2Icon aria-hidden />
                  Delete…
                </DropdownMenuItem>
              </>
            )}
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
