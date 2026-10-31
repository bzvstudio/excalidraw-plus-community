import type { JoinRequest, RemoteChanges, SceneAppState, SceneElement, ShareRole } from '@repo/api'
import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react'
import type { SaveStatus } from '@/components/scenes/save-status'
import { retryDelay, sceneAppStateOf, unsavedElements, versionsOf, withSavedVersions } from '@/helpers/scene-sync'
import { type CollabSocket, meansTryAgain, meansUnavailable, refusalMessage, SIGNED_OUT } from '@/services/collab/collab'

const ACK_TIMEOUT_MS = 10_000
const FIRST_RETRY_MS = 2_000
const MAX_RETRY_MS = 30_000
const SAVED_SETTLES_MS = 600

type Timer = ReturnType<typeof setTimeout> | undefined

type CollabOptions = {
  room: JoinRequest
  enabled: boolean
  socket: CollabSocket
  beforeSend: (elements: SceneElement[]) => Promise<unknown>
  onRemote: (changes: RemoteChanges) => readonly SceneElement[] | undefined
  onSent?: () => void
  onUnavailable: () => void
  onFileReady?: (fileId: string) => void
}

export type SaveState = { status: SaveStatus; failure?: string }

export type SaveStateStore = {
  get: () => SaveState
  subscribe: (listener: () => void) => () => void
  update: (change: Partial<SaveState>) => void
}

export function createSaveState(): SaveStateStore {
  let state: SaveState = { status: 'saved' }
  const listeners = new Set<() => void>()
  return {
    get: () => state,
    subscribe: (listener) => {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },
    update: (change) => {
      const next = { ...state, ...change }
      if (next.status === state.status && next.failure === state.failure) return
      state = next
      for (const listener of listeners) listener()
    },
  }
}

export function useSaveState(store: SaveStateStore): SaveState {
  return useSyncExternalStore(store.subscribe, store.get)
}

export function useShownSaveState(store: SaveStateStore): SaveState {
  const state = useSaveState(store)
  const [shown, setShown] = useState(state)
  const settling = state.status === 'saved' && shown.status === 'saving'
  if (!settling && shown !== state) setShown(state)

  useEffect(() => {
    if (!settling) return
    const timer = setTimeout(() => setShown(state), SAVED_SETTLES_MS)
    return () => clearTimeout(timer)
  }, [settling, state])

  return settling ? shown : state
}

export function useCollab(options: CollabOptions) {
  const { enabled, socket } = options
  const handlers = useRef(options)
  const [save] = useState(createSaveState)
  const [access, setAccess] = useState<ShareRole>()
  const live = useRef<CollabSocket | undefined>(undefined)
  const connection = useRef(0)
  const joined = useRef(false)
  const acknowledged = useRef<Map<string, number> | undefined>(undefined)
  const acknowledgedAppState = useRef<string | undefined>(undefined)
  const latest = useRef<{ elements: readonly SceneElement[]; appState: SceneAppState } | undefined>(undefined)
  const retryTimer = useRef<Timer>(undefined)
  const retries = useRef(0)
  const inFlight = useRef(false)
  const refused = useRef(false)
  const join = useRef<() => Promise<void>>(async () => undefined)

  useEffect(() => {
    handlers.current = options
  })

  const appStateUnsent = useCallback(
    () => latest.current !== undefined && JSON.stringify(latest.current.appState) !== acknowledgedAppState.current,
    [],
  )

  const pending = useCallback((): RemoteChanges | undefined => {
    const current = latest.current
    if (!current || !acknowledged.current) return undefined
    const elements = unsavedElements(current.elements, acknowledged.current)
    const appStateChanged = appStateUnsent()
    if (elements.length === 0 && !appStateChanged) return undefined
    return {
      elements: elements.map((element) => structuredClone(element)),
      ...(appStateChanged && { appState: current.appState }),
    }
  }, [appStateUnsent])

  const discardPending = useCallback(() => {
    if (!latest.current) return
    acknowledged.current = versionsOf(latest.current.elements)
    acknowledgedAppState.current = JSON.stringify(latest.current.appState)
  }, [])

  const refuse = useCallback((message: string) => {
    refused.current = true
    save.update({ status: 'failed', failure: message })
  }, [save])

  const send = useCallback(
    async function sendChanges(): Promise<void> {
      const current = live.current
      if (!current || !joined.current || inFlight.current || refused.current || retryTimer.current) return
      const changes = pending()
      if (!changes) return save.update({ status: 'saved' })
      inFlight.current = true
      save.update({ status: 'saving' })
      const generation = connection.current
      try {
        await handlers.current.beforeSend(changes.elements)
        const reply = await current.timeout(ACK_TIMEOUT_MS).emitWithAck('update', changes)
        if (generation !== connection.current) return
        inFlight.current = false
        if (reply.ok) {
          acknowledged.current = withSavedVersions(acknowledged.current ?? new Map(), changes.elements)
          if (changes.appState) acknowledgedAppState.current = JSON.stringify(changes.appState)
          retries.current = 0
          handlers.current.onSent?.()
          return sendChanges()
        }
        if (meansUnavailable(reply.refusal)) return handlers.current.onUnavailable()
        if (reply.refusal === 'not_joined') {
          joined.current = false
          return void join.current()
        }
        if (!meansTryAgain(reply.refusal)) return refuse(refusalMessage(reply.refusal))
      } catch {
        if (generation !== connection.current) return
        inFlight.current = false
      }
      save.update({ status: 'offline' })
      retryTimer.current = setTimeout(() => {
        retryTimer.current = undefined
        void sendChanges()
      }, retryDelay(retries.current++, FIRST_RETRY_MS, MAX_RETRY_MS))
    },
    [pending, refuse, save],
  )

  const receive = useCallback((changes: RemoteChanges) => {
    const shown = handlers.current.onRemote(changes)
    const saved = acknowledged.current
    if (saved && shown) {
      const kept = new Map(shown.map((element) => [element.id, element]))
      for (const remote of changes.elements) {
        const local = kept.get(remote.id)
        if (local?.version === remote.version && local.versionNonce === remote.versionNonce) saved.set(remote.id, remote.version)
      }
    }
    if (changes.appState && latest.current) {
      acknowledgedAppState.current = JSON.stringify(sceneAppStateOf({ ...latest.current.appState, ...changes.appState }))
    }
  }, [])

  const joinRoom = useCallback(async () => {
    const current = live.current
    if (!current) return
    const generation = connection.current
    try {
      const reply = await current.timeout(ACK_TIMEOUT_MS).emitWithAck('join', handlers.current.room)
      if (generation !== connection.current) return
      if (!reply.ok) {
        if (meansUnavailable(reply.refusal)) handlers.current.onUnavailable()
        else if (!meansTryAgain(reply.refusal)) refuse(refusalMessage(reply.refusal))
        return
      }
      joined.current = true
      setAccess(reply.access)
      receive(appStateUnsent() ? { elements: reply.elements } : reply)
      save.update({ status: 'saved' })
      void send()
    } catch {
      if (generation === connection.current) current.disconnect().connect()
    }
  }, [appStateUnsent, receive, refuse, save, send])

  useEffect(() => {
    join.current = joinRoom
  }, [joinRoom])

  useEffect(() => {
    if (!enabled) return
    const current = socket
    live.current = current
    const onConnect = () => void joinRoom()
    const onConnectError = () => {
      if (current.active) save.update({ status: 'offline' })
      else refuse(SIGNED_OUT)
    }
    const onDisconnect = () => {
      connection.current += 1
      joined.current = false
      inFlight.current = false
      save.update({ status: 'offline' })
    }
    const onAccess = (change: { access: ShareRole }) => {
      setAccess(change.access)
      if (change.access === 'view') discardPending()
      refused.current = false
      save.update({ status: 'saved', failure: undefined })
    }
    const onEvicted = () => handlers.current.onUnavailable()
    const onFileReady = ({ fileId }: { fileId: string }) => handlers.current.onFileReady?.(fileId)
    current.on('connect', onConnect)
    current.on('connect_error', onConnectError)
    current.on('disconnect', onDisconnect)
    current.on('update', receive)
    current.on('access', onAccess)
    current.on('evicted', onEvicted)
    current.on('file-ready', onFileReady)
    current.connect()
    return () => {
      const changes = joined.current && !refused.current ? pending() : undefined
      current.off('connect', onConnect)
      current.off('connect_error', onConnectError)
      current.off('disconnect', onDisconnect)
      current.off('update', receive)
      current.off('access', onAccess)
      current.off('evicted', onEvicted)
      current.off('file-ready', onFileReady)
      connection.current += 1
      joined.current = false
      inFlight.current = false
      clearTimeout(retryTimer.current)
      retryTimer.current = undefined
      live.current = undefined
      if (!changes) return void current.disconnect()
      void handlers.current
        .beforeSend(changes.elements)
        .then(() => current.emit('update', changes, () => undefined))
        .catch(() => undefined)
        .finally(() => {
          if (live.current !== current) current.disconnect()
        })
    }
  }, [discardPending, enabled, joinRoom, pending, receive, refuse, save, socket])

  useEffect(() => {
    const warnIfUnsaved = (event: BeforeUnloadEvent) => {
      if (pending() || inFlight.current) event.preventDefault()
    }
    window.addEventListener('beforeunload', warnIfUnsaved)
    return () => window.removeEventListener('beforeunload', warnIfUnsaved)
  }, [pending])

  const onChange = useCallback(
    (elements: readonly SceneElement[], appState: Record<string, unknown>) => {
      const picked = sceneAppStateOf(appState)
      latest.current = { elements, appState: picked }
      if (!acknowledged.current) {
        acknowledged.current = versionsOf(elements)
        acknowledgedAppState.current = JSON.stringify(picked)
        return
      }
      void send()
    },
    [send],
  )

  const retryNow = useCallback(() => {
    refused.current = false
    clearTimeout(retryTimer.current)
    retryTimer.current = undefined
    save.update({ status: 'saving', failure: undefined })
    if (live.current?.connected) void send()
    else live.current?.connect()
  }, [save, send])

  return { save, access, onChange, retryNow }
}
