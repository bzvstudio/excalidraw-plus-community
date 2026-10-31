import { CaptureUpdateAction, exportScene, newElementWith } from '@excalidraw/excalidraw'
import type { ExcalidrawFrameLikeElement, NonDeleted } from '@excalidraw/element/types'
import type { AppState } from '@excalidraw/excalidraw/types'
import { type PageImage, pageScale } from '@/helpers/deck-file'
import { deckOf, patchedSlide, type SlidePatch, slideSettingsOf, slidesOf } from './deck'
import type { EditorApi } from './files'
import { toSceneElements } from './scene-adapter'

const SLIDE_MARGIN = { top: 24, right: 24, bottom: 24, left: 24 }
const THUMBNAIL_SIZE = 240

export function writeSlideSettings(api: EditorApi, patches: ReadonlyMap<string, SlidePatch>) {
  if (patches.size === 0) return
  const elements = api.getSceneElementsIncludingDeleted().map((element) => {
    const patch = patches.get(element.id)
    if (!patch) return element
    const slide = patchedSlide(slideSettingsOf(toSceneElements([element])[0]!), patch)
    return newElementWith(element, { customData: { ...element.customData, slide } })
  })
  api.updateScene({ elements, captureUpdate: CaptureUpdateAction.IMMEDIATELY })
}

function frameIn(api: EditorApi, frameId: string) {
  return api.getSceneElements().find((element) => element.id === frameId) as NonDeleted<ExcalidrawFrameLikeElement> | undefined
}

export function showSlide(api: EditorApi, frameId: string) {
  const shown = frameIn(api, frameId)
  if (shown) api.setViewport({ target: shown, fit: 'contain', offsets: SLIDE_MARGIN })
}

export function onCanvasResize(api: EditorApi, resized: () => void): () => void {
  let { width, height } = api.getAppState()
  return api.onChange((_elements, appState) => {
    if (appState.width === width && appState.height === height) return
    width = appState.width
    height = appState.height
    resized()
  })
}

export type FrameLook = AppState['frameRendering']

export function enterPresenting(api: EditorApi): FrameLook {
  const look = api.getAppState().frameRendering
  api.updateScene({ appState: { openSidebar: null, frameRendering: { ...look, name: false, outline: false } } })
  return look
}

export function leavePresenting(api: EditorApi, look: FrameLook) {
  api.updateScene({ appState: { frameRendering: look } })
}

export function tellNoSlides(api: EditorApi, message: string) {
  api.setToast({ message, closable: true })
}

export async function renderPages(api: EditorApi, look: { dark: boolean; background: boolean }): Promise<PageImage[]> {
  const elements = api.getSceneElements()
  const deck = deckOf(toSceneElements(elements))
  const frames = slidesOf(deck).flatMap((frame) => frameIn(api, frame.id) ?? [])
  if (deck.length > 0 && frames.length === 0) return []
  const data = { elements, appState: api.getAppState(), files: api.getFiles() }
  const pages: PageImage[] = []
  for (const exportingFrame of frames.length > 0 ? frames : [null]) {
    let size = { width: 0, height: 0 }
    const png = await exportScene({
      data,
      type: 'png',
      config: {
        exportingFrame,
        theme: look.dark ? 'dark' : 'light',
        ...(!look.background && { canvasBackgroundColor: false }),
        scale: (width, height) => {
          size = { width, height }
          return pageScale(width, height)
        },
      },
    })
    pages.push({ png, ...size })
  }
  return pages
}

export async function slideThumbnail(api: EditorApi, frameId: string): Promise<Blob | undefined> {
  const exportingFrame = frameIn(api, frameId)
  if (!exportingFrame) return undefined
  return exportScene({
    data: { elements: api.getSceneElements(), appState: api.getAppState(), files: api.getFiles() },
    type: 'png',
    config: { exportingFrame, maxWidthOrHeight: THUMBNAIL_SIZE },
  })
}
