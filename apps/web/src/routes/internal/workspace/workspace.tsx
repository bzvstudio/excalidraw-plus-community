import { useQuery } from '@tanstack/react-query'
import { Outlet, useMatch, useNavigate, useParams, useRouterState } from '@tanstack/react-router'
import { COLLECTION_NAME_MAX_LENGTH } from '@repo/api/collections.const'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { toast } from 'sonner'
import { NameDialog } from '@/components/name-dialog'
import { DeleteCollectionDialog } from '@/components/scenes/delete-collection-dialog'
import { SceneFileInput } from '@/components/scenes/scene-file-input'
import { AppShell } from '@/components/shell/app-shell'
import { AppSidebar, WorkspaceNav } from '@/components/shell/app-sidebar'
import type { CollectionActions } from '@/components/shell/collections-nav'
import { CommandPalette } from '@/components/shell/command-palette'
import { InviteLinkDialog } from '@/components/workspaces/invite-dialogs'
import { type PaletteRunnable, paletteCommands } from '@/helpers/command-palette'
import { isScenePath, newWorkspaceLink, placeLink, sceneLink, settingsLink, workspaceLink } from '@/helpers/places'
import { isSettingsPath, settingsPlaceAt } from '@/helpers/settings-pages'
import { attempt } from '@/helpers/results'
import { rememberLastWorkspace } from '@/helpers/last-workspace'
import { rememberReturn } from '@/helpers/scene-return'
import { ShellContext } from '@/hooks/use-shell'
import { canEditScenes, canManageCollections, canManageWorkspace } from '@/helpers/roles'
import { newScenePlace } from '@/helpers/new-scene'
import { searchShortcut, togglesSidebar } from '@/helpers/shortcuts'
import { useImportScenes } from '@/hooks/use-import-scenes'
import {
  SIDEBAR_MENU_SELECTOR,
  SIDEBAR_SHEET_SELECTOR,
  setCollectionsOpen,
  setSidebarSheetOpen,
  toggleSidebar,
  useCollectionsOpen,
  useSidebarCollapsed,
  useSidebarSheetOpen,
  useWide,
} from '@/hooks/use-sidebar'
import { setThemePreference, useTheme } from '@/hooks/use-theme'
import { useWorkspace } from '@/hooks/use-workspace'
import { signOut } from '@/services/auth/session'
import { createScene } from '@/services/scenes/scenes'
import { requestInviteLink } from '@/services/workspaces/workspaces'
import {
  createCollection,
  deleteCollection,
  renameCollection,
} from '@/services/collections/collections'
import { trpc } from '@/trpc'
import type { Collection } from '@/types/api'

const NO_COLLECTIONS: Collection[] = []

type ShellDialog =
  | { kind: 'create' }
  | { kind: 'invite' }
  | { kind: 'rename'; collection: Collection }
  | { kind: 'delete'; collection: Collection }

export function WorkspaceRoute() {
  const { workspace } = useWorkspace()
  return <WorkspaceShell key={workspace.id} />
}

function WorkspaceShell() {
  const navigate = useNavigate()
  const location = useRouterState({ select: (state) => state.resolvedLocation ?? state.location })
  const pathname = location.pathname
  const { collectionId: shownCollectionId } = useParams({ strict: false })
  const { principal, workspace } = useWorkspace()
  const workspaceId = workspace.id
  const slug = workspace.slug
  const listedWorkspaces = useQuery(trpc.workspaces.list.queryOptions()).data
  const workspaces = useMemo(() => listedWorkspaces ?? [workspace], [listedWorkspaces, workspace])
  const collections = useQuery(trpc.collections.list.queryOptions({ workspaceId })).data ?? NO_COLLECTIONS
  const { preference } = useTheme()
  const collapsed = useSidebarCollapsed()
  const sheetOpen = useSidebarSheetOpen()
  const collectionsOpen = useCollectionsOpen()
  const onScene = isScenePath(pathname)
  const settingsPlace = settingsPlaceAt(pathname)
  const openScene = useMatch({ from: '/internal/$slug/scenes/$sceneId', shouldThrow: false })?.loaderData
  const wide = useWide()
  const [dialog, setDialog] = useState<ShellDialog>()
  const [paletteOpen, setPaletteOpen] = useState(false)
  const paletteOpener = useRef<Element | null>(null)
  const paletteKeepsFocus = useRef(false)
  const [fileInput, setFileInput] = useState<HTMLInputElement | null>(null)
  const creating = useRef(false)

  const openPalette = useCallback(() => {
    const active = document.activeElement
    paletteOpener.current = active?.closest(SIDEBAR_SHEET_SELECTOR) ? document.querySelector(SIDEBAR_MENU_SELECTOR) : active
    paletteKeepsFocus.current = false
    setSidebarSheetOpen(false)
    setPaletteOpen(true)
  }, [])

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.defaultPrevented) return
      const inDialog = !paletteOpen && document.querySelector('[role=dialog]:not([data-closed])') !== null
      const search = searchShortcut(event, { onCanvas: onScene && !paletteOpen, inDialog })
      if (search) {
        event.preventDefault()
        if (paletteOpen) setPaletteOpen(false)
        else if (search === 'open-palette') openPalette()
      } else if (!onScene && togglesSidebar(event)) {
        event.preventDefault()
        toggleSidebar()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onScene, openPalette, paletteOpen])

  useEffect(() => rememberLastWorkspace(principal.userId, workspaceId), [principal.userId, workspaceId])

  useEffect(() => {
    if (!onScene) rememberReturn(workspaceId, location.href)
  }, [onScene, workspaceId, location.href])

  const shellActions = useMemo(() => ({ openPalette }), [openPalette])

  useEffect(() => {
    setSidebarSheetOpen(false)
  }, [pathname])

  useEffect(() => {
    if (wide) setSidebarSheetOpen(false)
  }, [wide])

  const createSceneIn = useCallback(
    async (collectionId: string | undefined) => {
      if (creating.current) return
      creating.current = true
      const result = await attempt(async () => navigate(sceneLink(slug, (await createScene(workspaceId, collectionId)).id)))
      creating.current = false
      if (result.error) toast.error(result.error)
    },
    [navigate, slug, workspaceId],
  )

  const place = newScenePlace(shownCollectionId, openScene)
  const newScene = useCallback(() => void createSceneIn(place), [createSceneIn, place])

  const canCreateScene = canEditScenes(workspace.role)

  const placeName = place === undefined ? 'Drafts' : (collections.find(({ id }) => id === place)?.name ?? 'this collection')
  const { importFiles } = useImportScenes({
    workspaceId,
    workspaceSlug: slug,
    collectionId: place,
    placeName: place === undefined ? 'your drafts' : placeName,
  })
  const commands = useMemo(
    () => paletteCommands({ role: workspace.role, newScenePlaceName: placeName, theme: preference, workspaces, currentSlug: slug }),
    [workspace.role, placeName, preference, workspaces, slug],
  )

  const switchWorkspace = (next: string) => {
    const page = settingsPlace?.page
    if (!page || page.group === 'account') return void navigate(workspaceLink(next))
    const role = workspaces.find((candidate) => candidate.slug === next)?.role
    const allowed = !page.adminOnly || (role !== undefined && canManageWorkspace(role))
    void navigate(settingsLink(next, allowed ? page.id : 'general'))
  }

  const runCommand = (command: PaletteRunnable) => {
    if (command.kind === 'theme') return setThemePreference(command.theme)
    if (command.kind === 'workspace') return switchWorkspace(command.slug)
    if (command.action === 'new-scene') return newScene()
    if (command.action === 'import') return fileInput?.click()
    paletteKeepsFocus.current = true
    setDialog({ kind: command.action === 'invite' ? 'invite' : 'create' })
  }

  const onSignOut = async () => {
    await signOut()
    await navigate({ to: '/sign-in' })
  }

  const collectionActions: CollectionActions | undefined = canManageCollections(workspace.role)
    ? {
        onCreate: () => setDialog({ kind: 'create' }),
        onRename: (collection) => setDialog({ kind: 'rename', collection }),
        onCreateScene: (collection) => void createSceneIn(collection.id),
        onDelete: (collection) => setDialog({ kind: 'delete', collection }),
      }
    : undefined

  const sidebar = (
    <AppSidebar
      principal={principal}
      workspace={workspace}
      workspaces={workspaces}
      themePreference={preference}
      onSearch={openPalette}
      onNewScene={canCreateScene ? newScene : undefined}
      onThemeChange={setThemePreference}
      onSwitchWorkspace={switchWorkspace}
      onCreateWorkspace={() => void navigate(newWorkspaceLink())}
      onOpenAccount={() => void navigate(settingsLink(slug, 'account'))}
      onSignOut={onSignOut}
    >
      <WorkspaceNav
        workspaceSlug={slug}
        collections={collections}
        collectionActions={collectionActions}
        collectionsOpen={collectionsOpen}
        onCollectionsOpenChange={setCollectionsOpen}
      />
    </AppSidebar>
  )

  return (
    <ShellContext value={shellActions}>
      <AppShell
        sidebar={sidebar}
        collapsed={collapsed}
        sheetOpen={sheetOpen}
        fullBleed={onScene}
        pageKey={isSettingsPath(pathname) ? 'settings' : pathname}
        keepScroll={location.hash !== ''}
        onSheetOpenChange={setSidebarSheetOpen}
      >
        <Outlet />
      </AppShell>
      <CommandPalette
        open={paletteOpen}
        workspaceId={workspaceId}
        workspaceSlug={slug}
        userId={principal.userId}
        collections={collections}
        commands={commands}
        finalFocus={() => {
          if (paletteKeepsFocus.current) return false
          const opener = paletteOpener.current
          return opener instanceof HTMLElement && opener !== document.body && opener.isConnected ? opener : false
        }}
        onCommand={runCommand}
        onClose={() => setPaletteOpen(false)}
      />
      {canCreateScene && (
        <SceneFileInput ref={setFileInput} label="Choose scene files to import" onFiles={(files) => void importFiles(files)} />
      )}
      {dialog?.kind === 'invite' && (
        <InviteLinkDialog
          onClose={() => setDialog(undefined)}
          onCreate={(role, maxUses) => requestInviteLink(workspaceId, role, maxUses)}
        />
      )}
      {dialog?.kind === 'create' && (
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
      {dialog?.kind === 'rename' && (
        <NameDialog
          title="Rename collection"
          label="Collection name"
          initial={dialog.collection.name}
          maxLength={COLLECTION_NAME_MAX_LENGTH}
          onClose={() => setDialog(undefined)}
          onSubmit={(name) => attempt(() => renameCollection(workspaceId, dialog.collection.id, name))}
        />
      )}
      {dialog?.kind === 'delete' && (
        <DeleteCollectionDialog
          collection={dialog.collection}
          onClose={() => setDialog(undefined)}
          onConfirm={() =>
            attempt(async () => {
              const shown = shownCollectionId === dialog.collection.id
              await deleteCollection(workspaceId, dialog.collection.id, shown ? () => navigate(workspaceLink(slug)) : undefined)
              toast(`Deleted “${dialog.collection.name}”`)
            })
          }
        />
      )}
    </ShellContext>
  )
}
