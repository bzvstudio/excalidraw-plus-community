import { CaptureUpdateAction, reconcileElements, restoreElements } from '@excalidraw/excalidraw'
import type { RemoteExcalidrawElement } from '@excalidraw/excalidraw/data/reconcile'
import type { RemoteChanges, SceneElement } from '@repo/api'
import type { EditorApi } from './files'
import { fromSceneAppState, fromSceneElements, toSceneElements } from './scene-adapter'

export function applyRemoteChanges(api: EditorApi, changes: RemoteChanges): SceneElement[] {
  const local = api.getSceneElementsIncludingDeleted()
  const remote = restoreElements(fromSceneElements(changes.elements), local) as RemoteExcalidrawElement[]
  const reconciled = reconcileElements(local, remote, api.getAppState())
  api.updateScene({
    elements: reconciled,
    ...(changes.appState && { appState: fromSceneAppState(changes.appState) }),
    captureUpdate: CaptureUpdateAction.NEVER,
  })
  return toSceneElements(reconciled)
}
