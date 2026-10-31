import type { Presence, PresentPerson, RelayedPresence } from '@repo/api'
import { PRESENCE_SELECTION_MAX } from '@repo/api/collab.const'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { EditorApi } from '@/editor/files'
import { type FollowTarget, followViewport, type Participant, showCollaborators } from '@/editor/presence'
import { type Peer, selectedIds, visibleBounds } from '@/helpers/presence'
import type { CollabSocket } from '@/services/collab/collab'

const SEND_EVERY_MS = 50
const IDLE_AFTER_MS = 60_000

type Timer = ReturnType<typeof setTimeout> | undefined

const NO_PEERS: Peer[] = []

function samePeers(shown: readonly Peer[], people: ReadonlyMap<string, Participant>): boolean {
  if (shown.length !== people.size) return false
  let index = 0
  for (const person of people.values()) {
    const peer = shown[index++]!
    if (peer.id !== person.id || peer.name !== person.name || peer.avatarId !== person.avatarId) return false
  }
  return true
}

export function usePresence(options: { socket: CollabSocket; api: EditorApi | null }) {
  const { socket, api } = options
  const people = useRef(new Map<string, Participant>())
  const [userToFollow, setUserToFollow] = useState<FollowTarget | null>(null)
  const [peers, setPeers] = useState<Peer[]>(NO_PEERS)
  const shownPeers = useRef<readonly Peer[]>(NO_PEERS)
  const following = useRef<string | undefined>(undefined)
  const followers = useRef(0)
  const selection = useRef('')
  const userState = useRef<NonNullable<Presence['userState']>>('active')
  const idleTimer = useRef<Timer>(undefined)
  const queued = useRef<Presence | undefined>(undefined)
  const sendTimer = useRef<Timer>(undefined)
  const lastSent = useRef(0)
  const button = useRef<Presence['button']>('up')

  const show = useCallback(() => {
    if (api) showCollaborators(api, people.current)
    if (samePeers(shownPeers.current, people.current)) return
    const next = Array.from(people.current.values(), ({ id, name, avatarId }) => ({ id, name, avatarId }))
    shownPeers.current = next
    setPeers(next)
  }, [api])

  const flush = useCallback(() => {
    sendTimer.current = undefined
    if (!queued.current) return
    const lasting = queued.current.userState !== undefined || queued.current.selectedElementIds !== undefined
    if (lasting) socket.emit('presence', queued.current)
    else socket.volatile.emit('presence', queued.current)
    queued.current = undefined
    lastSent.current = Date.now()
  }, [socket])

  const send = useCallback(
    (presence: Presence) => {
      queued.current = { ...queued.current, ...presence }
      if (sendTimer.current) return
      sendTimer.current = setTimeout(flush, Math.max(0, lastSent.current + SEND_EVERY_MS - Date.now()))
    },
    [flush],
  )

  const sendViewport = useCallback(() => {
    if (api && followers.current > 0) send({ viewport: visibleBounds(api.getAppState()) })
  }, [api, send])

  const setUserState = useCallback(
    (state: NonNullable<Presence['userState']>) => {
      if (userState.current === state) return
      userState.current = state
      send({ userState: state })
    },
    [send],
  )

  const markActive = useCallback(() => {
    if (document.visibilityState === 'visible') setUserState('active')
    clearTimeout(idleTimer.current)
    idleTimer.current = setTimeout(() => setUserState('idle'), IDLE_AFTER_MS)
  }, [setUserState])

  const stopFollowing = useCallback(() => {
    following.current = undefined
    setUserToFollow(null)
  }, [])

  useEffect(() => {
    const onPeople = (list: PresentPerson[]) => {
      people.current = new Map(list.map((person) => [person.id, person]))
      show()
      stopFollowing()
    }
    const onArrived = (person: PresentPerson) => {
      people.current.set(person.id, person)
      show()
    }
    const onDeparted = ({ id }: { id: string }) => {
      people.current.delete(id)
      show()
      if (following.current === id) stopFollowing()
    }
    const onPresence = ({ from, viewport, ...presence }: RelayedPresence) => {
      const person = people.current.get(from)
      if (!person) return
      if (viewport && api && following.current === from) followViewport(api, viewport)
      if (Object.keys(presence).length === 0) return
      people.current.set(from, { ...person, ...presence })
      show()
    }
    const onFollowers = ({ count }: { count: number }) => {
      followers.current = count
      sendViewport()
    }
    const onDisconnect = () => {
      people.current = new Map()
      followers.current = 0
      show()
      stopFollowing()
    }
    socket.on('people', onPeople)
    socket.on('arrived', onArrived)
    socket.on('departed', onDeparted)
    socket.on('presence', onPresence)
    socket.on('followers', onFollowers)
    socket.on('disconnect', onDisconnect)
    return () => {
      socket.off('people', onPeople)
      socket.off('arrived', onArrived)
      socket.off('departed', onDeparted)
      socket.off('presence', onPresence)
      socket.off('followers', onFollowers)
      socket.off('disconnect', onDisconnect)
    }
  }, [api, sendViewport, show, socket, stopFollowing])

  useEffect(() => {
    const onVisibility = () => {
      if (document.visibilityState === 'visible') return markActive()
      clearTimeout(idleTimer.current)
      setUserState('away')
    }
    document.addEventListener('visibilitychange', onVisibility)
    document.addEventListener('keydown', markActive)
    window.addEventListener('resize', sendViewport)
    markActive()
    return () => {
      document.removeEventListener('visibilitychange', onVisibility)
      document.removeEventListener('keydown', markActive)
      window.removeEventListener('resize', sendViewport)
      clearTimeout(idleTimer.current)
      clearTimeout(sendTimer.current)
      sendTimer.current = undefined
    }
  }, [markActive, sendViewport, setUserState])

  const onPointerUpdate = useCallback(
    (update: { pointer: NonNullable<Presence['pointer']>; button: NonNullable<Presence['button']> }) => {
      markActive()
      send({ pointer: update.pointer, button: update.button })
      if (update.button === button.current) return
      button.current = update.button
      clearTimeout(sendTimer.current)
      flush()
    },
    [flush, markActive, send],
  )

  const onSelectionChange = useCallback(
    (selected: Readonly<Record<string, boolean>>) => {
      const ids = selectedIds(selected).slice(0, PRESENCE_SELECTION_MAX)
      const key = ids.join('\n')
      if (key === selection.current) return
      selection.current = key
      send({ selectedElementIds: ids })
    },
    [send],
  )

  const onUserFollow = useCallback(
    (payload: { userToFollow: FollowTarget; action: 'FOLLOW' | 'UNFOLLOW' }) => {
      const id = payload.userToFollow.socketId
      if (payload.action === 'FOLLOW') {
        following.current = id
        setUserToFollow(payload.userToFollow)
      } else {
        stopFollowing()
      }
      socket.emit('follow', { id, following: payload.action === 'FOLLOW' })
    },
    [socket, stopFollowing],
  )

  const toggleFollow = useCallback(
    (peer: Peer) =>
      onUserFollow({
        userToFollow: { socketId: peer.id, username: peer.name },
        action: following.current === peer.id ? 'UNFOLLOW' : 'FOLLOW',
      }),
    [onUserFollow],
  )

  return useMemo(
    () => ({ userToFollow, peers, toggleFollow, onPointerUpdate, onSelectionChange, onUserFollow, onScrollChange: sendViewport }),
    [userToFollow, peers, toggleFollow, onPointerUpdate, onSelectionChange, onUserFollow, sendViewport],
  )
}
