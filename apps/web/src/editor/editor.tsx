import '@excalidraw/excalidraw/index.css'
import './editor.css'
import { Excalidraw, MainMenu } from '@excalidraw/excalidraw'
import type { OrderedExcalidrawElement } from '@excalidraw/element/types'
import type { ExcalidrawProps, SocketId } from '@excalidraw/excalidraw/types'
import type { SceneAppState, SceneElement } from '@repo/api'
import { memo, type ReactNode, useEffect, useRef } from 'react'
import type { ColorScheme, ThemePreference } from '@/hooks/use-theme'
import { cn } from '@/lib/utils'
import type { EditorApi, EditorFiles } from './files'
import type { FollowTarget } from './presence'
import { fromSceneElements } from './scene-adapter'

const EMBED_MARGIN = { top: 24, right: 24, bottom: 56, left: 24 }

export type EditorScene = {
  elements: readonly SceneElement[]
  appState: SceneAppState
}

export const Editor = memo(function Editor({
  colorScheme,
  themePreference,
  onThemePreferenceChange,
  initialScene,
  readOnly,
  embedded = false,
  libraryBrowsing,
  aiEnabled = false,
  maxImageBytes,
  onReady,
  onChange,
  presence,
  presenting,
  children,
}: {
  colorScheme: ColorScheme
  themePreference: ThemePreference
  onThemePreferenceChange: (preference: ThemePreference) => void
  initialScene: EditorScene
  readOnly: boolean
  embedded?: boolean
  libraryBrowsing: boolean
  aiEnabled?: boolean
  maxImageBytes: number
  onReady?: (api: EditorApi) => void
  onChange?: (
    elements: readonly OrderedExcalidrawElement[],
    appState: Record<string, unknown>,
    files: EditorFiles,
  ) => void
  presence?: {
    userToFollow: FollowTarget | null
    onPointerUpdate: NonNullable<ExcalidrawProps['onPointerUpdate']>
    onUserFollow: (payload: { userToFollow: FollowTarget; action: 'FOLLOW' | 'UNFOLLOW' }) => void
    onScrollChange: () => void
    onSelectionChange: (selected: Readonly<Record<string, boolean>>) => void
  }
  presenting?: { label: string; onExit: () => void }
  children?: ReactNode
}) {
  const api = useRef<EditorApi | null>(null)
  const fitted = useRef(!embedded)
  const isPresenting = presenting !== undefined
  const wasPresenting = useRef(false)

  useEffect(() => {
    if (wasPresenting.current && !isPresenting) api.current?.setActiveTool({ type: 'selection' })
    wasPresenting.current = isPresenting
  }, [isPresenting])

  return (
    <div className={cn('contents', !libraryBrowsing && 'library-browsing-off', embedded && 'embedded', presence && 'own-people', readOnly && 'read-only')}>
      <Excalidraw
        theme={colorScheme}
        onThemeChange={onThemePreferenceChange}
        initialData={{ elements: fromSceneElements(initialScene.elements), appState: initialScene.appState }}
        viewModeEnabled={readOnly || embedded}
        zenModeEnabled={embedded || presenting !== undefined}
        ui={presenting ? false : undefined}
        interaction={presenting ? { enabled: { tools: { laser: true }, links: true } } : undefined}
        activeTool={presenting ? { type: 'laser' } : undefined}
        viewportStatusFrame={
          presenting ? { label: { label: presenting.label, onClose: presenting.onExit }, border: false } : null
        }
        imageOptions={{ maxFileSizeBytes: maxImageBytes }}
        aiEnabled={aiEnabled}
        onExcalidrawAPI={(ready) => {
          api.current = ready
          if (ready) onReady?.(ready)
        }}
        onChange={(elements, appState, files) => {
          if (!fitted.current && elements.length > 0 && api.current) {
            fitted.current = true
            api.current.setViewport({ target: elements, fit: 'contain', offsets: EMBED_MARGIN })
          }
          presence?.onSelectionChange(appState.selectedElementIds)
          onChange?.(elements, appState as unknown as Record<string, unknown>, files)
        }}
        isCollaborating={presence !== undefined}
        onPointerUpdate={presence?.onPointerUpdate}
        onUserFollow={presence?.onUserFollow}
        onScrollChange={presence?.onScrollChange}
        userToFollow={
          presence?.userToFollow && { ...presence.userToFollow, socketId: presence.userToFollow.socketId as SocketId }
        }
      >
        {!presenting && (
          <MainMenu>
            <MainMenu.DefaultItems.LoadScene />
            <MainMenu.DefaultItems.SaveToActiveFile />
            <MainMenu.DefaultItems.Export />
            <MainMenu.DefaultItems.SaveAsImage />
            <MainMenu.DefaultItems.CommandPalette />
            <MainMenu.DefaultItems.SearchMenu />
            <MainMenu.DefaultItems.Help />
            {!readOnly && <MainMenu.DefaultItems.ClearCanvas />}
            <MainMenu.Separator />
            <MainMenu.DefaultItems.ToggleTheme allowSystemTheme theme={themePreference} />
            <MainMenu.DefaultItems.ChangeCanvasBackground />
          </MainMenu>
        )}
        {children}
      </Excalidraw>
    </div>
  )
})
