import { Link } from '@tanstack/react-router'
import { FolderIcon } from '@animateicons/react/lucide/folder-icon'
import { PencilIcon } from '@animateicons/react/lucide/pencil-icon'
import { PlusIcon } from '@animateicons/react/lucide/plus-icon'
import { Trash2Icon } from '@animateicons/react/lucide/trash-2-icon'
import { AnimatedIcon } from '@/components/ui/animated-icon'
import { ChevronRightIcon, EllipsisIcon, UsersIcon } from 'lucide-react'
import { useId } from 'react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { placeLink } from '@/helpers/places'
import { cn } from '@/lib/utils'
import type { Collection } from '@/types/api'
import { SIDEBAR_ICON_BUTTON, SIDEBAR_ROW } from './sidebar-styles'

export type CollectionActions = {
  onCreate: () => void
  onCreateScene: (collection: Collection) => void
  onRename: (collection: Collection) => void
  onDelete: (collection: Collection) => void
}

export function CollectionsNav({
  workspaceSlug,
  collections,
  actions,
  open,
  onOpenChange,
}: {
  workspaceSlug: string
  collections: Collection[]
  actions?: CollectionActions
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const listId = useId()

  return (
    <nav aria-label="Collections" className={cn('flex min-h-0 flex-col', open && 'min-h-24')}>
      <div className="group/heading flex h-8 shrink-0 items-center gap-1">
        <button
          type="button"
          aria-expanded={open}
          aria-controls={listId}
          onClick={() => onOpenChange(!open)}
          className="flex h-7 min-w-0 flex-1 items-center gap-1 rounded-md px-2 text-xs font-medium text-muted-foreground transition-colors duration-150 outline-none hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring motion-reduce:transition-none"
        >
          Collections
          <ChevronRightIcon
            aria-hidden
            className={cn('size-3.5 transition-transform duration-150 motion-reduce:transition-none', open && 'rotate-90')}
          />
        </button>
        {actions && (
          <Tooltip>
            <TooltipTrigger
              aria-label="New collection"
              onClick={actions.onCreate}
              className={cn(SIDEBAR_ICON_BUTTON, 'size-7')}
            >
              <AnimatedIcon icon={PlusIcon} />
            </TooltipTrigger>
            <TooltipContent side="right">New collection</TooltipContent>
          </Tooltip>
        )}
      </div>
      <ul id={listId} hidden={!open} className="-mx-1 flex min-h-0 flex-col gap-px overflow-y-auto px-1 py-0.5">
        {collections.length === 0 && <li className="px-2 py-1.5 text-xs text-muted-foreground">No collections yet</li>}
        {collections.map((collection) => (
          <li key={collection.id} className="group/collection relative flex items-center">
            <Link {...placeLink(workspaceSlug, collection.id)} className={cn(SIDEBAR_ROW, 'flex-1', actions && 'pr-8')}>
              <AnimatedIcon icon={FolderIcon} />
              <span className="min-w-0 flex-1 truncate">{collection.name}</span>
              {collection.teamIds.length > 0 && (
                <UsersIcon aria-label="Kept to teams" className="size-3.5 shrink-0 opacity-70" />
              )}
            </Link>
            {actions && (
              <DropdownMenu>
                <DropdownMenuTrigger
                  aria-label={`${collection.name} options`}
                  className={cn(
                    SIDEBAR_ICON_BUTTON,
                    'absolute right-1 size-6 opacity-0 group-hover/collection:opacity-100 focus-visible:opacity-100 aria-expanded:opacity-100 [@media(hover:none)]:opacity-100',
                  )}
                >
                  <EllipsisIcon aria-hidden className="size-4" />
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start">
                  <DropdownMenuItem onClick={() => actions.onCreateScene(collection)}>
                    <AnimatedIcon icon={PlusIcon} />
                    New scene here
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => actions.onRename(collection)}>
                    <AnimatedIcon icon={PencilIcon} />
                    Rename
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem variant="destructive" onClick={() => actions.onDelete(collection)}>
                    <AnimatedIcon icon={Trash2Icon} />
                    Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </li>
        ))}
      </ul>
    </nav>
  )
}
