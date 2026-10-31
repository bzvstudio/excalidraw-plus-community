import { Link, type LinkProps } from '@tanstack/react-router'
import { DRAFTS } from '@repo/api/scenes.const'
import { FileTextIcon, FolderIcon, UsersIcon } from 'lucide-react'
import type { ComponentType } from 'react'
import { Skeleton } from '@/components/ui/skeleton'
import { type CollectionSummary, type DraftsSummary, sceneCountLabel } from '@/helpers/home'
import { placeLink } from '@/helpers/places'
import { timeAgo } from '@/helpers/time'

function Tile({
  link,
  icon: Icon,
  name,
  sceneCount,
  lastChangedAt,
  keptToTeams = false,
}: {
  link: LinkProps
  icon: ComponentType<{ className?: string; 'aria-hidden'?: boolean }>
  name: string
  sceneCount: number
  lastChangedAt: string | undefined
  keptToTeams?: boolean
}) {
  return (
    <li>
      <Link
        {...link}
        className="group/tile flex min-w-0 items-center gap-3 rounded-xl border bg-background p-3 transition-colors duration-150 outline-none hover:border-input hover:bg-muted/40 focus-visible:ring-3 focus-visible:ring-ring motion-reduce:transition-none"
      >
        <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground transition-colors duration-150 group-hover/tile:text-foreground motion-reduce:transition-none">
          <Icon aria-hidden className="size-4" />
        </span>
        <span className="flex min-w-0 flex-col">
          <span className="flex min-w-0 items-center gap-1.5 text-sm font-medium text-foreground">
            <span className="truncate">{name}</span>
            {keptToTeams && <UsersIcon aria-label="Kept to teams" className="size-3.5 shrink-0 text-muted-foreground" />}
          </span>
          <span className="truncate text-xs text-muted-foreground tabular-nums">
            {sceneCountLabel(sceneCount)}
            {lastChangedAt && ` · edited ${timeAgo(new Date(lastChangedAt))}`}
          </span>
        </span>
      </Link>
    </li>
  )
}

export function CollectionTiles({
  workspaceSlug,
  drafts,
  collections,
}: {
  workspaceSlug: string
  drafts?: DraftsSummary
  collections: readonly CollectionSummary[]
}) {
  return (
    <ul className="grid gap-3 sm:grid-cols-2">
      {drafts && (
        <Tile
          link={placeLink(workspaceSlug, DRAFTS)}
          icon={FileTextIcon}
          name="Your drafts"
          sceneCount={drafts.sceneCount}
          lastChangedAt={drafts.lastChangedAt}
        />
      )}
      {collections.map(({ collection, sceneCount, lastChangedAt }) => (
        <Tile
          key={collection.id}
          link={placeLink(workspaceSlug, collection.id)}
          icon={FolderIcon}
          name={collection.name}
          sceneCount={sceneCount}
          lastChangedAt={lastChangedAt}
          keptToTeams={collection.teamIds.length > 0}
        />
      ))}
    </ul>
  )
}

export function CollectionTilesSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {Array.from({ length: count }, (_, index) => (
        <div key={index} className="flex items-center gap-3 rounded-xl border p-3">
          <Skeleton className="size-9 rounded-lg" />
          <div className="flex flex-1 flex-col gap-1.5">
            <Skeleton className="h-3.5 w-1/2" />
            <Skeleton className="h-3 w-1/3" />
          </div>
        </div>
      ))}
    </div>
  )
}
