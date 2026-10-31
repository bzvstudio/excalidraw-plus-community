import type { ClientEvents, CollabRefusal, ServerEvents } from '@repo/api'
import { SOCKET_PATH } from '@repo/api/system.const'
import { io, type Socket } from 'socket.io-client'

export type CollabSocket = Socket<ServerEvents, ClientEvents>

export function connectToRooms(): CollabSocket {
  return io({ path: SOCKET_PATH, withCredentials: true, autoConnect: false })
}

const REFUSAL_MESSAGES: Partial<Record<CollabRefusal, string>> = {
  too_large: 'This scene has reached its size limit. Split it into several scenes, then retry.',
  forbidden: 'You can no longer edit this scene.',
  invalid: 'The server could not read this change.',
}

export const SIGNED_OUT = 'You have been signed out. Sign in again in another tab, then retry.'

export function meansUnavailable(refusal: CollabRefusal): boolean {
  return refusal === 'not_found' || refusal === 'gone'
}

export function meansTryAgain(refusal: CollabRefusal): boolean {
  return refusal === 'unavailable'
}

export function refusalMessage(refusal: CollabRefusal): string {
  return REFUSAL_MESSAGES[refusal] ?? 'The server refused this change.'
}
