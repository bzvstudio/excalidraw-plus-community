import { EllipsisIcon, EyeIcon, MessageSquareIcon, MessageSquarePlusIcon, PhoneIcon, PlayIcon, SearchIcon, GalleryVerticalIcon } from 'lucide-react'
import type { AiOptions, JoinRequest, RemoteChanges, SceneAppState, SceneElement } from '@repo/api'
import type { OrderedExcalidrawElement } from '@excalidraw/element/types'
import { type ReactNode, useCallback, useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { CallBar } from '@/components/calls/call-bar'
import { ScreenPanel } from '@/components/calls/screen-panel'
import { CommentList } from '@/components/scenes/comment-list'
import { CommentThreadCard } from '@/components/scenes/comment-thread'
import { type DeckExport, ExportDeckDialog } from '@/components/scenes/export-deck-dialog'
import { PeopleStack } from '@/components/scenes/people-stack'
import { PresentationOffer } from '@/components/scenes/presentation-offer'
import { SaveStatusBadge } from '@/components/scenes/save-status'
import { ScenePanel } from '@/components/scenes/scene-panel'
import { SceneTitle } from '@/components/scenes/scene-title'
import { SceneBarButton, SceneTopBar } from '@/components/scenes/scene-top-bar'
import { Button } from '@/components/ui/button'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { CommentLayer } from '@/editor/comment-layer'
import { Editor } from '@/editor/editor'
import { TextToDiagram } from '@/editor/text-to-diagram'
import { DiagramToCode } from '@/editor/diagram-to-code'
import type { EditorApi, EditorFiles } from '@/editor/files'
import { FOLLOW_EDGE_LAYER } from '@/editor/layers'
import { applyRemoteChanges } from '@/editor/remote-changes'
import { toSceneElements } from '@/editor/scene-adapter'
import { renderPages } from '@/editor/slides'
import { SlidesPanel } from '@/editor/slides-panel'
import { useServerLibrary } from '@/editor/use-server-library'
import { pdfOf, pptxOf, preloadDeckFiles, saveFile } from '@/editor/export'
import { deckFileName } from '@/helpers/deck-file'
import { chord } from '@/helpers/platform'
import { addsComment } from '@/helpers/shortcuts'
import { sceneAppStateOf } from '@/helpers/scene-sync'
import { useWide } from '@/hooks/use-sidebar'
import { cn } from '@/lib/utils'
import { setThemePreference, useTheme } from '@/hooks/use-theme'
import { useRuntimeConfig } from '@/services/config/config'
import type { FileTransfer } from '@/services/files/files'
import { connectToRooms } from '@/services/collab/collab'
import { isLibraryConflict, loadLibrary, saveLibrary } from '@/services/library/library'
import { useCall } from '@/hooks/use-call'
import { type SaveStateStore, useCollab, useShownSaveState } from '@/hooks/use-collab'
import { useComments } from '@/hooks/use-comments'
import { useSlides } from '@/hooks/use-slides'
import { usePresence } from '@/hooks/use-presence'
import { useSceneFiles } from '@/hooks/use-scene-files'
import { useThumbnail } from '@/hooks/use-thumbnail'

const LIBRARY_SERVER = { load: loadLibrary, save: saveLibrary, isConflict: isLibraryConflict }

export type CanvasScene = {
  title: string
  elements: readonly SceneElement[]
  appState: SceneAppState
}

function presentingLabel(
  presenting: { index: number; total: number },
  live: { following: { presenterName: string } | null; broadcasting: boolean },
) {
  const counter = `${presenting.index + 1} / ${presenting.total}`
  if (live.following) return `${counter} · following ${live.following.presenterName}`
  return live.broadcasting ? `${counter} · presenting to everyone` : counter
}

type PanelName = 'comments' | 'slides'

function LiveSaveStatus({ store, onRetry }: { store: SaveStateStore; onRetry: () => void }) {
  const { status, failure } = useShownSaveState(store)
  return <SaveStatusBadge status={status} failure={failure} onRetry={onRetry} />
}

type EditorChange = (elements: readonly OrderedExcalidrawElement[], appState: Record<string, unknown>, files: EditorFiles) => void

export function SceneCanvas({
  scene,
  room,
  ai,
  readOnly,
  transfer,
  onUnavailable,
  uploadThumbnail,
  withLibrary,
  leading,
  title,
  guestControls,
  onSearch,
  share,
}: {
  scene: CanvasScene
  room: JoinRequest
  ai?: AiOptions
  readOnly: boolean
  transfer: FileTransfer
  onUnavailable: () => void
  uploadThumbnail?: (png: Blob) => Promise<unknown>
  withLibrary: boolean
  leading?: ReactNode
  title?: ReactNode
  guestControls?: (viewOnly: boolean) => ReactNode
  onSearch?: () => void
  share?: ReactNode
}) {
  const { preference, colorScheme } = useTheme()
  const { fileMaxBytes, libraryBrowsing, callsEnabled } = useRuntimeConfig()
  const wide = useWide()
  const ids = {
    commentsPanel: useId(),
    slidesPanel: useId(),
    commentsToggle: useId(),
    slidesToggle: useId(),
    more: useId(),
  }
  const [editorApi, setEditorApi] = useState<EditorApi | null>(null)
  const [panel, setPanel] = useState<{ name: PanelName; focus: boolean } | null>(null)
  const [initialScene] = useState(() => ({ elements: scene.elements, appState: scene.appState }))
  useServerLibrary(withLibrary ? editorApi : null, LIBRARY_SERVER, libraryBrowsing)
  const files = useSceneFiles({ transfer, initialElements: initialScene.elements })
  const { uploadReferenced, fetchMissing, fileReady } = files
  const thumbnail = useThumbnail(uploadThumbnail)
  const { onSaved } = thumbnail
  const onRemote = useCallback(
    (changes: RemoteChanges) => {
      if (!editorApi) return undefined
      void fetchMissing(changes.elements)
      return applyRemoteChanges(editorApi, changes)
    },
    [editorApi, fetchMissing],
  )
  const onFileReady = useCallback(
    (fileId: string) => {
      if (editorApi) fileReady(fileId, toSceneElements(editorApi.getSceneElements()))
    },
    [editorApi, fileReady],
  )
  const [socket] = useState(connectToRooms)
  const presence = usePresence({ socket, api: editorApi })
  const collab = useCollab({
    room,
    enabled: editorApi !== null,
    socket,
    beforeSend: uploadReferenced,
    onRemote,
    onSent: onSaved,
    onUnavailable,
    onFileReady,
  })
  const viewOnly = collab.access ? collab.access === 'view' : readOnly
  const slides = useSlides(editorApi, socket)
  const call = useCall(room)
  const comments = useComments(room, editorApi, socket)
  const { placing, canPost, togglePlacing } = comments
  const panelName = panel?.name ?? null
  const addComment = useCallback(() => {
    if (!placing) setPanel(wide ? { name: 'comments', focus: false } : null)
    if (canPost) togglePlacing()
  }, [canPost, placing, togglePlacing, wide])
  const togglePanel = useCallback(
    (name: PanelName) => setPanel((current) => (current?.name === name ? null : { name, focus: true })),
    [],
  )
  const closePanel = useCallback(() => setPanel(null), [])

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (!addsComment(event) || slides.presenting) return
      event.preventDefault()
      addComment()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [addComment, slides.presenting])
  const openThreads = useMemo(() => comments.threads.filter((thread) => !thread.resolvedAt), [comments.threads])
  const pins = useMemo(
    () => openThreads.map((thread, index) => ({ id: thread.id, anchor: thread.anchor, label: String(index + 1) })),
    [openThreads],
  )
  const card = comments.draft ?? comments.selected?.anchor
  const [exporting, setExporting] = useState(false)
  const openExport = useCallback(() => {
    preloadDeckFiles()
    setExporting(true)
  }, [])
  const exportDeck = useCallback(
    async (choice: DeckExport) => {
      if (!editorApi) return
      const pages = await renderPages(editorApi, choice)
      const file = choice.format === 'pdf' ? await pdfOf(pages) : await pptxOf(pages)
      saveFile(file, deckFileName(scene.title, choice.format))
    },
    [editorApi, scene.title],
  )
  const aiScene = ai && !viewOnly && 'sceneId' in room ? room.sceneId : undefined
  const presenting = slides.presenting !== null
  const canJoinCall = callsEnabled && call.state.status !== 'in-call'
  const joining = call.state.status === 'joining'
  const joinCallLabel = joining ? 'Joining the call…' : 'Join call'
  const commentsLabel = openThreads.length > 0 ? `Comments, ${openThreads.length} open` : 'Comments'

  const onFilesReady = files.onReady
  const onEditorReady = useCallback(
    (api: EditorApi) => {
      onFilesReady(api)
      setEditorApi(api)
    },
    [onFilesReady],
  )
  const changeHandler = useRef<EditorChange | null>(null)
  useLayoutEffect(() => {
    changeHandler.current = (elements, appState, editorFiles) => {
      const sceneElements = toSceneElements(elements)
      slides.onScene(sceneElements)
      if (viewOnly) return
      files.onFilesChange(editorFiles)
      thumbnail.track({ elements, appState: sceneAppStateOf(appState), files: editorFiles })
      collab.onChange(sceneElements, appState)
    }
  })
  const onEditorChange = useCallback<EditorChange>((...args) => changeHandler.current?.(...args), [])

  const presentingIndex = slides.presenting?.index
  const presentingTotal = slides.presenting?.total
  const followedPresenter = slides.live.following?.presenterName
  const { broadcasting } = slides.live
  const stopPresenting = slides.stop
  const presentingState = useMemo(
    () =>
      presentingIndex === undefined || presentingTotal === undefined
        ? undefined
        : {
            label: presentingLabel(
              { index: presentingIndex, total: presentingTotal },
              { following: followedPresenter === undefined ? null : { presenterName: followedPresenter }, broadcasting },
            ),
            onExit: stopPresenting,
          },
    [presentingIndex, presentingTotal, followedPresenter, broadcasting, stopPresenting],
  )

  const editorChildren = useMemo(
    () => (
      <>
        {ai?.textToDiagram && aiScene && <TextToDiagram sceneId={aiScene} />}
        {ai?.diagramToCode && aiScene && editorApi && <DiagramToCode api={editorApi} sceneId={aiScene} />}
      </>
    ),
    [ai?.textToDiagram, ai?.diagramToCode, aiScene, editorApi],
  )

  const { save, retryNow } = collab
  const status = useMemo(() => {
    if (!viewOnly) return <LiveSaveStatus store={save} onRetry={retryNow} />
    if (guestControls) return null
    return (
      <span className="flex items-center gap-1 text-xs leading-4 whitespace-nowrap text-muted-foreground">
        <EyeIcon aria-hidden className="size-3.5" />
        View only
      </span>
    )
  }, [viewOnly, guestControls, save, retryNow])

  const offered = slides.live.offered?.presenterName
  const { follow, start } = slides
  const { peers, userToFollow, toggleFollow } = presence
  const followingId = userToFollow?.socketId
  const { join } = call
  const trailing = useMemo(
    () => (
      <>
        {offered !== undefined && <PresentationOffer presenter={offered} onFollow={follow} />}
        <PeopleStack peers={peers} followingId={followingId} max={wide ? 4 : 2} onFollow={toggleFollow} />
        {guestControls?.(viewOnly)}
        {wide ? (
          <>
            {canJoinCall && <SceneBarButton label={joinCallLabel} icon={<PhoneIcon aria-hidden />} disabled={joining} onClick={join} />}
            {onSearch && <SceneBarButton label="Search" shortcut={chord('P')} icon={<SearchIcon aria-hidden />} onClick={onSearch} />}
            <SceneBarButton
              id={ids.commentsToggle}
              label={commentsLabel}
              text="Comments"
              icon={<MessageSquareIcon aria-hidden />}
              badge={openThreads.length}
              expanded={panelName === 'comments'}
              controls={ids.commentsPanel}
              onClick={() => togglePanel('comments')}
            />
            <SceneBarButton
              id={ids.slidesToggle}
              label="Slides"
              text="Slides"
              icon={<GalleryVerticalIcon aria-hidden />}
              expanded={panelName === 'slides'}
              controls={ids.slidesPanel}
              onClick={() => togglePanel('slides')}
            />
            <span aria-hidden className="mx-1 h-5 w-px bg-border" />
            <Button variant="outline" size="sm" onClick={() => start()}>
              <PlayIcon aria-hidden />
              Present
            </Button>
          </>
        ) : (
          <>
            <SceneBarButton
              id={ids.commentsToggle}
              label={commentsLabel}
              icon={<MessageSquareIcon aria-hidden />}
              badge={openThreads.length}
              expanded={panelName === 'comments'}
              controls={ids.commentsPanel}
              onClick={() => togglePanel('comments')}
            />
            <DropdownMenu>
              <DropdownMenuTrigger
                render={
                  <Button id={ids.more} variant="ghost" size="icon-sm" aria-label="More actions" className="text-muted-foreground hover:text-foreground" />
                }
              >
                <EllipsisIcon aria-hidden />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => start()}>
                  <PlayIcon aria-hidden />
                  Present
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => togglePanel('slides')}>
                  <GalleryVerticalIcon aria-hidden />
                  Slides
                </DropdownMenuItem>
                {onSearch && (
                  <DropdownMenuItem onClick={onSearch}>
                    <SearchIcon aria-hidden />
                    Search
                  </DropdownMenuItem>
                )}
                {canJoinCall && (
                  <DropdownMenuItem disabled={joining} onClick={join}>
                    <PhoneIcon aria-hidden />
                    {joinCallLabel}
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </>
        )}
        {share}
      </>
    ),
    [
      offered,
      follow,
      peers,
      followingId,
      wide,
      toggleFollow,
      guestControls,
      viewOnly,
      canJoinCall,
      joinCallLabel,
      joining,
      join,
      onSearch,
      ids.commentsToggle,
      ids.commentsPanel,
      ids.slidesToggle,
      ids.slidesPanel,
      ids.more,
      commentsLabel,
      openThreads.length,
      panelName,
      togglePanel,
      start,
      share,
    ],
  )

  const toggleFor = (name: PanelName) => () =>
    document.getElementById(name === 'comments' ? ids.commentsToggle : wide ? ids.slidesToggle : ids.more)

  return (
    <div className="fixed inset-0 flex flex-col bg-canvas">
      {!presenting && (
        <SceneTopBar leading={leading} title={title ?? <SceneTitle title={scene.title} />} status={status} trailing={trailing} />
      )}
      <div className="flex min-h-0 flex-1">
        <div className="relative min-w-0 flex-1">
          <Editor
            colorScheme={colorScheme}
            themePreference={preference}
            onThemePreferenceChange={setThemePreference}
            initialScene={initialScene}
            readOnly={viewOnly}
            maxImageBytes={fileMaxBytes}
            libraryBrowsing={libraryBrowsing && withLibrary}
            aiEnabled={aiScene !== undefined && (ai?.textToDiagram || ai?.diagramToCode)}
            onReady={onEditorReady}
            onChange={onEditorChange}
            presence={presence}
            presenting={presentingState}
          >
            {editorChildren}
          </Editor>
          {presence.userToFollow && !presenting && (
            <div aria-hidden className={cn('pointer-events-none absolute inset-0 ring-2 ring-brand/70 ring-inset', FOLLOW_EDGE_LAYER)} />
          )}
          {!presenting && (
            <CommentLayer
              api={editorApi}
              pins={pins}
              selectedId={comments.selectedId}
              placing={comments.placing}
              onSelect={comments.selectById}
              onPlace={comments.placeAt}
              onCancelPlacing={comments.cancelPlacing}
              card={
                card && {
                  anchor: card,
                  content: (
                    <CommentThreadCard
                      key={comments.selectedId ?? 'draft'}
                      thread={comments.draft ? undefined : comments.selected}
                      canPost={comments.canPost}
                      canResolve={comments.canResolve}
                      onPost={comments.post}
                      onEdit={comments.edit}
                      onRemove={comments.remove}
                      onResolve={comments.resolve}
                      onClose={comments.close}
                    />
                  ),
                }
              }
            />
          )}
          {call.state.status === 'in-call' && call.state.snapshot.screen && <ScreenPanel screen={call.state.snapshot.screen} />}
          {call.state.status === 'in-call' ? (
            <div className="absolute bottom-16 left-1/2 z-10 -translate-x-1/2 max-md:bottom-24">
              <CallBar
                snapshot={call.state.snapshot}
                notice={call.state.notice}
                onMute={call.setMuted}
                onShare={call.setSharing}
                onStartAudio={call.startAudio}
                onLeave={call.leave}
              />
            </div>
          ) : (
            call.state.status === 'idle' &&
            call.state.notice && (
              <p
                className="absolute bottom-16 left-1/2 z-10 -translate-x-1/2 rounded-lg bg-popover px-3 py-1.5 text-xs text-muted-foreground shadow-float max-md:bottom-24"
                role="status"
              >
                {call.state.notice}
              </p>
            )
          )}
        </div>
        {!presenting && (
          <>
            <ScenePanel
              id={ids.commentsPanel}
              title="Comments"
              open={panelName === 'comments'}
              docked={wide}
              autoFocus={panel?.focus ?? false}
              returnFocus={toggleFor('comments')}
              onClose={closePanel}
              actions={
                comments.canPost && (
                  <Button variant="outline" size="xs" aria-pressed={comments.placing} onClick={addComment}>
                    <MessageSquarePlusIcon aria-hidden />
                    Add comment
                  </Button>
                )
              }
            >
              <CommentList
                threads={comments.threads}
                selectedId={comments.selectedId}
                canPost={comments.canPost}
                onSelect={(thread) => {
                  if (!wide) closePanel()
                  comments.select(thread)
                }}
              />
            </ScenePanel>
            <ScenePanel
              id={ids.slidesPanel}
              title="Slides"
              open={panelName === 'slides'}
              docked={wide}
              autoFocus={panel?.focus ?? false}
              returnFocus={toggleFor('slides')}
              onClose={closePanel}
            >
              <SlidesPanel
                api={editorApi}
                open={panelName === 'slides'}
                deck={slides.deck}
                contentVersion={slides.contentVersion}
                canEdit={!viewOnly}
                onMove={slides.move}
                onToggle={slides.toggle}
                onPresent={slides.start}
                onPresentToEveryone={slides.presentToEveryone}
                presenterElsewhere={slides.live.offered?.presenterName}
                onExport={openExport}
              />
            </ScenePanel>
          </>
        )}
      </div>
      {exporting && (
        <ExportDeckDialog
          frameCount={slides.deck.length}
          slideCount={slides.deck.filter((slide) => slide.included).length}
          dark={colorScheme === 'dark'}
          onClose={() => setExporting(false)}
          onExport={exportDeck}
        />
      )}
    </div>
  )
}
