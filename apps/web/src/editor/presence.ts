import { CaptureUpdateAction, zoomToFitBounds } from '@excalidraw/excalidraw'
import type { Person, Presence, SceneBounds } from '@repo/api'
import type { Collaborator, SocketId } from '@excalidraw/excalidraw/types'
import { colorOf } from '@/helpers/presence'
import type { EditorApi } from './files'

export type Participant = Person & Omit<Presence, 'viewport'>

export type FollowTarget = { socketId: string; username: string }

export function showCollaborators(api: EditorApi, people: ReadonlyMap<string, Participant>) {
  const collaborators = new Map<SocketId, Collaborator>()
  for (const person of people.values()) {
    collaborators.set(person.id as SocketId, {
      id: person.id,
      socketId: person.id as SocketId,
      username: person.name,
      color: colorOf(person.id),
      pointer: person.pointer,
      button: person.button,
      userState: person.userState as Collaborator['userState'],
      selectedElementIds: Object.fromEntries((person.selectedElementIds ?? []).map((id) => [id, true])),
    })
  }
  api.updateScene({ collaborators })
}

export function followViewport(api: EditorApi, bounds: SceneBounds) {
  const { appState } = zoomToFitBounds({ bounds, appState: api.getAppState(), fit: 'contain' })
  api.updateScene({ appState, captureUpdate: CaptureUpdateAction.NEVER })
}
