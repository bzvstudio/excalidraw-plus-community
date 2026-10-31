import { DiagramToCodePlugin, exportScene, parseSSEStream } from '@excalidraw/excalidraw'
import { isTextElement } from '@excalidraw/element'
import type { GenerateDiagramToCode } from '@excalidraw/excalidraw/types'
import { useEffect, useState } from 'react'
import { collectPage } from '@/helpers/generated-page'
import { requestDiagramToCode } from '@/services/ai/ai'
import { dataUrlOf, type EditorApi } from './files'

const WIREFRAME_IMAGE_MAX_SIDE = 1600

export function DiagramToCode({ api, sceneId }: { api: EditorApi; sceneId: string }) {
  const [leaving] = useState(() => new AbortController())
  useEffect(() => () => leaving.abort(), [leaving])

  const generate: GenerateDiagramToCode = async ({ frame, children, onPartial }) => {
    const appState = api.getAppState()
    const { theme } = appState
    const image = await exportScene({
      data: { elements: children, appState, files: api.getFiles() },
      type: 'png',
      config: { exportingFrame: frame, maxWidthOrHeight: WIREFRAME_IMAGE_MAX_SIDE, theme },
    })
    const reader = await requestDiagramToCode(
      sceneId,
      { texts: children.filter(isTextElement).map((element) => element.originalText), image: await dataUrlOf(image), theme },
      leaving.signal,
    )
    return { html: await collectPage(parseSSEStream(reader), onPartial) }
  }

  return <DiagramToCodePlugin generate={generate} />
}
