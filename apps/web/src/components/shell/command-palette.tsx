import { Autocomplete } from '@base-ui/react/autocomplete'
import { Dialog as DialogPrimitive } from '@base-ui/react/dialog'
import { keepPreviousData, useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate, useRouter } from '@tanstack/react-router'
import { SCENE_TITLE_MAX_LENGTH } from '@repo/api/scenes.const'
import {
  ActivityIcon,
  ArrowRightLeftIcon,
  FileTextIcon,
  FolderIcon,
  FolderPlusIcon,
  HouseIcon,
  LoaderCircleIcon,
  MonitorIcon,
  MoonIcon,
  PlusIcon,
  SearchIcon,
  SunIcon,
  UploadIcon,
  UserPlusIcon,
  UsersIcon,
} from 'lucide-react'
import { type ComponentType, type KeyboardEvent, memo, useEffect, useId, useMemo, useRef, useState } from 'react'
import { SceneThumbnail } from '@/components/scenes/scene-card'
import { DialogOverlay, DialogPortal } from '@/components/ui/dialog'
import { Kbd, KbdGroup } from '@/components/ui/kbd'
import {
  PALETTE_PLACEHOLDER,
  PALETTE_PLACEHOLDER_NARROW,
  PALETTE_RECENT_SHOWN,
  PALETTE_SCENES_SHOWN,
  PALETTE_SEARCH_DELAY_MS,
} from '@/constants/command-palette'
import { SETTINGS_ICONS } from '@/constants/settings-icons'
import { placeNameOf } from '@/helpers/activity'
import {
  type PaletteActionId,
  type PaletteCommand,
  type PaletteCommands,
  type PaletteGroup,
  type PaletteItem,
  type PalettePage,
  type PaletteRunnable,
  paletteGroups,
  paletteItems,
  paletteTarget,
} from '@/helpers/command-palette'
import { jumpBackIn } from '@/helpers/home'
import { IS_MAC, chord } from '@/helpers/platform'
import { recentVisits } from '@/helpers/recent-visits'
import { timeAgo } from '@/helpers/time'
import { useDebouncedValue } from '@/hooks/use-debounced-value'
import { useWide } from '@/hooks/use-sidebar'
import type { ThemePreference } from '@/hooks/use-theme'
import { cn } from '@/lib/utils'
import { thumbnailUrl } from '@/services/thumbnails/thumbnails'
import { trpc } from '@/trpc'
import type { Collection, SceneListItem } from '@/types/api'

type Icon = ComponentType<{ className?: string; 'aria-hidden'?: boolean }>

type Run = (item: PaletteItem, inNewTab: boolean) => void

const PAGE_ICONS: Record<PalettePage, Icon> = { home: HouseIcon, drafts: FileTextIcon, activity: ActivityIcon }

const ACTION_ICONS: Record<PaletteActionId, Icon> = {
  'new-scene': PlusIcon,
  'new-collection': FolderPlusIcon,
  import: UploadIcon,
  invite: UserPlusIcon,
}

const THEME_ICONS: Record<ThemePreference, Icon> = { light: SunIcon, dark: MoonIcon, system: MonitorIcon }

const NO_SCENES: SceneListItem[] = []

const NEW_SCENE_KEYS = IS_MAC ? '⌥A' : 'Alt A'

const MOVE_KEYS = ['↑', '↓']
const OPEN_KEYS = ['↵']
const NEW_TAB_KEYS = [chord('↵')]
const CLOSE_KEYS = ['Esc']

const PANEL =
  'fixed z-50 flex flex-col overflow-hidden bg-popover text-sm text-popover-foreground shadow-float outline-none duration-150 data-open:animate-in data-open:fade-in-0 data-closed:animate-out data-closed:fade-out-0 motion-reduce:animate-none max-sm:inset-0 max-sm:data-open:slide-in-from-bottom-4 sm:top-[12vh] sm:left-1/2 sm:max-h-[min(34rem,calc(100dvh-16vh))] sm:w-[calc(100%-2rem)] sm:max-w-[640px] sm:-translate-x-1/2 sm:rounded-2xl sm:data-open:zoom-in-95 sm:data-closed:zoom-out-95'

export type PaletteProps = {
  open: boolean
  workspaceId: string
  workspaceSlug: string
  userId: string
  collections: readonly Collection[]
  commands: PaletteCommands
  finalFocus?: () => HTMLElement | boolean
  onCommand: (command: PaletteRunnable) => void
  onClose: () => void
}

export function CommandPalette({ open, finalFocus, onClose, ...body }: PaletteProps) {
  const [session, setSession] = useState(0)
  const [wasOpen, setWasOpen] = useState(open)
  if (open !== wasOpen) {
    setWasOpen(open)
    if (open) setSession(session + 1)
  }
  return (
    <DialogPrimitive.Root open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogPortal>
        <DialogOverlay />
        <DialogPrimitive.Popup aria-label="Command palette" finalFocus={finalFocus} className={PANEL}>
          <PaletteBody key={session} {...body} open={open} onClose={onClose} />
        </DialogPrimitive.Popup>
      </DialogPortal>
    </DialogPrimitive.Root>
  )
}

function PaletteBody({
  workspaceId,
  workspaceSlug,
  userId,
  collections,
  commands,
  open,
  onCommand,
  onClose,
}: Omit<PaletteProps, 'finalFocus'>) {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const router = useRouter()
  const hintsId = useId()
  const wide = useWide()
  const [query, setQuery] = useState('')
  const typed = query.trim()
  const search = useDebouncedValue(typed, PALETTE_SEARCH_DELAY_MS)
  const [visits] = useState(() => recentVisits(userId, workspaceId))
  const highlighted = useRef<PaletteItem | undefined>(undefined)
  const latestQuery = useRef('')
  const closed = useRef(false)

  useEffect(() => {
    if (!open) closed.current = true
  }, [open])

  const everything = useQuery({ ...trpc.scenes.list.queryOptions({ workspaceId }), enabled: typed === '' })
  const found = useQuery({
    ...trpc.scenes.list.queryOptions({ workspaceId, search, limit: PALETTE_SCENES_SHOWN }),
    placeholderData: keepPreviousData,
    enabled: search !== '',
  })

  const pending = typed !== '' && (search !== typed || found.isPlaceholderData || found.isPending)
  const scenes = typed === '' ? NO_SCENES : (found.data ?? NO_SCENES)
  const recent = useMemo(() => jumpBackIn(everything.data ?? [], visits, userId, PALETTE_RECENT_SHOWN), [everything.data, visits, userId])
  const groups = useMemo(
    () => paletteGroups({ query: typed, scenes, recent, collections, commands }),
    [typed, scenes, recent, collections, commands],
  )
  const collectionNames = useMemo(() => new Map(collections.map(({ id, name }) => [id, name])), [collections])

  const shown = paletteItems(groups).length
  const announcement =
    typed === '' ? '' : pending ? 'Searching…' : shown === 0 ? `No results for “${typed}”` : `${shown} ${shown === 1 ? 'result' : 'results'}`

  const run: Run = (item, inNewTab) => {
    closed.current = true
    onClose()
    const target = paletteTarget(item, workspaceSlug)
    if ('command' in target) return onCommand(target.command)
    if (inNewTab) window.open(router.buildLocation(target.link).href, '_blank', 'noopener')
    else void navigate(target.link)
  }

  const runWhenFound = async (asked: string, inNewTab: boolean) => {
    const answer = await queryClient
      .fetchQuery(trpc.scenes.list.queryOptions({ workspaceId, search: asked, limit: PALETTE_SCENES_SHOWN }))
      .catch(() => NO_SCENES)
    if (closed.current || latestQuery.current.trim() !== asked) return
    const first = paletteItems(paletteGroups({ query: asked, scenes: answer, recent, collections, commands }))[0]
    if (first) run(first, inNewTab)
  }

  const choose = (item: PaletteItem | undefined, inNewTab: boolean) => {
    if (pending && (!item || item.kind === 'scene')) return void runWhenFound(typed, inNewTab)
    if (item) run(item, inNewTab)
  }

  const onKeyDown = (event: KeyboardEvent<HTMLInputElement> & { preventBaseUIHandler?: () => void }) => {
    if (event.key === 'Escape') {
      event.preventBaseUIHandler?.()
      event.preventDefault()
      onClose()
      return
    }
    if (event.key !== 'Enter' || event.nativeEvent.isComposing) return
    event.preventBaseUIHandler?.()
    event.preventDefault()
    choose(highlighted.current, event.metaKey || event.ctrlKey)
  }

  return (
    <Autocomplete.Root
      open
      inline
      items={groups}
      filter={null}
      value={query}
      autoHighlight="always"
      keepHighlight
      itemToStringValue={(item: PaletteItem) => item.label}
      onValueChange={(next, details) => {
        if (details.reason === 'item-press') return
        latestQuery.current = next
        setQuery(next)
      }}
      onItemHighlighted={(item: PaletteItem | undefined) => {
        highlighted.current = item
      }}
    >
      <div className="flex h-14 shrink-0 items-center gap-3 border-b px-4 max-sm:h-13 max-sm:pr-2">
        <SearchIcon aria-hidden className="size-4.5 shrink-0 text-muted-foreground" />
        <Autocomplete.Input
          aria-label="Search scenes, collections and commands"
          aria-describedby={hintsId}
          placeholder={wide ? PALETTE_PLACEHOLDER : PALETTE_PLACEHOLDER_NARROW}
          maxLength={SCENE_TITLE_MAX_LENGTH}
          autoComplete="off"
          spellCheck={false}
          onKeyDown={onKeyDown}
          className="h-full min-w-0 flex-1 bg-transparent text-[15px] text-foreground outline-none placeholder:text-muted-foreground max-sm:text-base"
        />
        {pending && <LoaderCircleIcon aria-hidden className="size-4 shrink-0 animate-spin text-muted-foreground motion-reduce:animate-none" />}
        <DialogPrimitive.Close className="h-8 shrink-0 rounded-lg px-2.5 text-sm font-medium text-muted-foreground transition-colors duration-150 outline-none hover:bg-muted hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring motion-reduce:transition-none sm:hidden">
          Cancel
        </DialogPrimitive.Close>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain sm:max-h-[min(26rem,calc(100dvh-16vh-6.5rem))] [scroll-padding-block:0.5rem]">
        <Autocomplete.Empty>
          <p aria-hidden className="flex flex-col items-center gap-1 px-6 py-12 text-center text-sm text-muted-foreground">
            {pending ? 'Searching…' : `No results for “${typed}”`}
            {!pending && <span className="text-xs">Try fewer words, or part of a title.</span>}
          </p>
        </Autocomplete.Empty>
        <Autocomplete.List aria-busy={pending} className="p-2 empty:hidden">
          {(group: PaletteGroup) => (
            <Autocomplete.Group key={group.id} items={group.items} className="not-first:mt-2">
              <Autocomplete.GroupLabel className="flex h-7 items-center px-2 text-xs font-medium text-muted-foreground select-none">
                {group.label}
              </Autocomplete.GroupLabel>
              <Autocomplete.Collection>
                {(item: PaletteItem) => (
                  <Autocomplete.Item
                    key={item.key}
                    value={item}
                    onClick={(event) => choose(item, event.metaKey || event.ctrlKey)}
                    className={cn(
                      'group/item flex min-h-10 cursor-default items-center gap-3 rounded-lg px-2 py-1.5 text-foreground outline-none select-none [scroll-margin-block:0.5rem] data-highlighted:bg-accent',
                      item.kind === 'scene' && pending && 'opacity-60',
                    )}
                  >
                    <ItemContent
                      item={item}
                      workspaceId={workspaceId}
                      placeName={item.kind === 'scene' ? placeNameOf(item.scene, collectionNames, userId) : undefined}
                    />
                  </Autocomplete.Item>
                )}
              </Autocomplete.Collection>
            </Autocomplete.Group>
          )}
        </Autocomplete.List>
      </div>
      <Autocomplete.Status className="sr-only">{announcement}</Autocomplete.Status>
      <p id={hintsId} className="sr-only">
        Use the up and down arrows to choose, Enter to open, and {chord('Enter')} to open in a new tab.
      </p>
      <PaletteHints />
    </Autocomplete.Root>
  )
}

function ItemContent({ item, workspaceId, placeName }: { item: PaletteItem; workspaceId: string; placeName?: string }) {
  switch (item.kind) {
    case 'scene':
      return <SceneRow scene={item.scene} workspaceId={workspaceId} placeName={placeName} />
    case 'collection':
      return (
        <>
          <IconTile icon={FolderIcon} />
          <span className="min-w-0 flex-1 truncate">{item.label}</span>
          {item.collection.teamIds.length > 0 && (
            <>
              <UsersIcon aria-hidden className="size-3.5 shrink-0 text-muted-foreground" />
              <span className="sr-only">, kept to teams</span>
            </>
          )}
        </>
      )
    default:
      return (
        <>
          <IconTile icon={commandIcon(item)} />
          <span className="min-w-0 flex-1 truncate">{item.label}</span>
          {item.detail && <span className="shrink-0 truncate text-xs text-muted-foreground">{item.detail}</span>}
          {item.kind === 'action' && item.action === 'new-scene' && (
            <Kbd aria-hidden className="max-sm:hidden [@media(pointer:coarse)]:hidden">
              {NEW_SCENE_KEYS}
            </Kbd>
          )}
        </>
      )
  }
}

function SceneRow({ scene, workspaceId, placeName }: { scene: SceneListItem; workspaceId: string; placeName?: string }) {
  return (
    <>
      <SceneThumbnail
        compact
        src={scene.thumbnailUpdatedAt ? thumbnailUrl(workspaceId, scene.id, scene.thumbnailUpdatedAt) : undefined}
        className="w-12 shrink-0 rounded-md"
      />
      <span className="flex min-w-0 flex-1 flex-col">
        <span className="truncate font-medium">{scene.title}</span>
        <span className="truncate text-xs text-muted-foreground">
          {placeName} · <span className="tabular-nums">{timeAgo(new Date(scene.updatedAt))}</span>
        </span>
      </span>
    </>
  )
}

function commandIcon(item: PaletteCommand): Icon {
  switch (item.kind) {
    case 'go':
      return 'settings' in item.destination ? SETTINGS_ICONS[item.destination.settings] : PAGE_ICONS[item.destination.page]
    case 'action':
      return ACTION_ICONS[item.action]
    case 'theme':
      return THEME_ICONS[item.theme]
    case 'workspace':
      return ArrowRightLeftIcon
  }
}

function IconTile({ icon: Icon }: { icon: Icon }) {
  return (
    <span className="flex size-7 shrink-0 items-center justify-center rounded-md border bg-background text-muted-foreground group-data-highlighted/item:text-foreground">
      <Icon aria-hidden className="size-4" />
    </span>
  )
}

const PaletteHints = memo(function PaletteHints() {
  return (
    <div
      aria-hidden
      className="flex h-10 shrink-0 items-center gap-4 border-t px-4 text-xs text-muted-foreground max-sm:hidden [@media(pointer:coarse)]:hidden"
    >
      <Hint keys={MOVE_KEYS} label="Move" />
      <Hint keys={OPEN_KEYS} label="Open" />
      <Hint keys={NEW_TAB_KEYS} label="Open in a new tab" />
      <span className="flex-1" />
      <Hint keys={CLOSE_KEYS} label="Close" />
    </div>
  )
})

function Hint({ keys, label }: { keys: readonly string[]; label: string }) {
  return (
    <span className="flex items-center gap-1.5">
      <KbdGroup>
        {keys.map((key) => (
          <Kbd key={key}>{key}</Kbd>
        ))}
      </KbdGroup>
      {label}
    </span>
  )
}
