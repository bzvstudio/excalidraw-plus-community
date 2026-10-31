import type { Presentation, SceneElement } from '@repo/api'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { NO_SLIDES } from '@/constants/slides'
import { deckOf, movedSlide, type Slide, slidesOf, toggledSlide } from '@/editor/deck'
import type { EditorApi } from '@/editor/files'
import {
  enterPresenting,
  type FrameLook,
  leavePresenting,
  onCanvasResize,
  showSlide,
  tellNoSlides,
  writeSlideSettings,
} from '@/editor/slides'
import type { CollabSocket } from '@/services/collab/collab'

const FORWARD = ['ArrowRight', 'ArrowDown', 'PageDown', ' ']
const BACK = ['ArrowLeft', 'ArrowUp', 'PageUp']
const CONTENT_SETTLES_MS = 1_000

function deckKey(deck: readonly Slide[]) {
  return deck.map(({ frame, included }) => `${frame.id}:${frame.version}:${included}`).join(',')
}

function placeOf(frame: SceneElement) {
  return [frame.id, frame.x, frame.y, frame.width, frame.height].join(':')
}

export function useSlides(api: EditorApi | null, socket: CollabSocket) {
  const [deck, setDeck] = useState<Slide[]>([])
  const [roomPresentation, setRoomPresentation] = useState<Presentation | null>(null)
  const [following, setFollowing] = useState(false)
  const [broadcasting, setBroadcasting] = useState(false)
  const [contentVersion, setContentVersion] = useState(0)
  const [presentingId, setPresentingId] = useState<string | null>(null)
  const deckKeyRef = useRef('')
  const lastIndex = useRef(0)
  const sceneVersion = useRef(0)
  const settleTimer = useRef<ReturnType<typeof setTimeout>>(undefined)
  const frameLook = useRef<FrameLook | undefined>(undefined)
  const slides = useMemo(() => slidesOf(deck), [deck])
  const followedId =
    following && roomPresentation && slides.some((frame) => frame.id === roomPresentation.slideId)
      ? roomPresentation.slideId
      : null
  const shownId = followedId ?? presentingId
  const index = shownId === null ? -1 : slides.findIndex((frame) => frame.id === shownId)
  const current = index === -1 ? undefined : slides[index]
  const place = current && placeOf(current)

  const onScene = useCallback((elements: readonly SceneElement[]) => {
    const next = deckOf(elements)
    const key = deckKey(next)
    if (key !== deckKeyRef.current) {
      deckKeyRef.current = key
      setDeck(next)
    }
    const version = elements.reduce((sum, element) => sum + element.version, 0)
    if (version === sceneVersion.current) return
    sceneVersion.current = version
    clearTimeout(settleTimer.current)
    settleTimer.current = setTimeout(() => setContentVersion(version), CONTENT_SETTLES_MS)
  }, [])

  const stop = useCallback(() => {
    setPresentingId(null)
    setFollowing(false)
    if (broadcasting) socket.emit('present', { slideId: null })
    setBroadcasting(false)
    if (api && frameLook.current) leavePresenting(api, frameLook.current)
    frameLook.current = undefined
    if (document.fullscreenElement) void document.exitFullscreen().catch(() => undefined)
  }, [api, broadcasting, socket])

  const start = useCallback(
    (slideId?: string) => {
      if (!api) return false
      const first = slides.find((frame) => frame.id === slideId) ?? slides[0]
      if (!first) {
        tellNoSlides(api, NO_SLIDES)
        return false
      }
      frameLook.current ??= enterPresenting(api)
      setPresentingId(first.id)
      if (!document.fullscreenElement) void document.documentElement.requestFullscreen?.().catch(() => undefined)
      return true
    },
    [api, slides],
  )

  useEffect(() => {
    if (index !== -1) lastIndex.current = index
    if (shownId === null || index !== -1) return
    const nearest = slides[Math.min(lastIndex.current, slides.length - 1)]
    if (nearest) setPresentingId(nearest.id)
    else stop()
  }, [index, shownId, slides, stop])

  useEffect(() => {
    if (broadcasting && presentingId !== null) socket.emit('present', { slideId: presentingId })
  }, [broadcasting, presentingId, socket])

  useEffect(() => {
    const onPresentation = (presentation: Presentation | null) => {
      setRoomPresentation(presentation)
      if (presentation && broadcasting) setBroadcasting(false)
      if (!following) return
      if (!presentation) stop()
      else if (slides.some((frame) => frame.id === presentation.slideId)) setPresentingId(presentation.slideId)
    }
    const onDisconnect = () => {
      setRoomPresentation(null)
      if (following) stop()
      setBroadcasting(false)
    }
    socket.on('presentation', onPresentation)
    socket.on('disconnect', onDisconnect)
    return () => {
      socket.off('presentation', onPresentation)
      socket.off('disconnect', onDisconnect)
    }
  }, [broadcasting, following, slides, socket, stop])

  useEffect(() => {
    if (!api || !place) return
    const frameId = place.split(':')[0]!
    const fit = () => showSlide(api, frameId)
    fit()
    return onCanvasResize(api, fit)
  }, [api, place])

  useEffect(() => {
    if (shownId === null) return
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        stop()
      } else {
        const step = FORWARD.includes(event.key) ? 1 : BACK.includes(event.key) ? -1 : 0
        if (step === 0) return
        const next = slides[Math.min(Math.max(index + step, 0), slides.length - 1)]
        if (next && !following) setPresentingId(next.id)
      }
      event.preventDefault()
      event.stopPropagation()
    }
    const onFullscreen = () => {
      if (!document.fullscreenElement) stop()
    }
    window.addEventListener('keydown', onKey, { capture: true })
    document.addEventListener('fullscreenchange', onFullscreen)
    return () => {
      window.removeEventListener('keydown', onKey, { capture: true })
      document.removeEventListener('fullscreenchange', onFullscreen)
    }
  }, [following, index, shownId, slides, stop])

  useEffect(
    () => () => {
      clearTimeout(settleTimer.current)
      if (frameLook.current && document.fullscreenElement) void document.exitFullscreen().catch(() => undefined)
    },
    [],
  )

  const presentToEveryone = useCallback(
    (slideId?: string) => {
      if (roomPresentation || !start(slideId)) return
      setFollowing(false)
      setBroadcasting(true)
    },
    [roomPresentation, start],
  )

  const follow = useCallback(() => {
    if (roomPresentation && start(roomPresentation.slideId)) setFollowing(true)
  }, [roomPresentation, start])

  const move = useCallback(
    (from: number, to: number) => {
      if (api && to >= 0 && to < deck.length) writeSlideSettings(api, movedSlide(deck, from, to))
    },
    [api, deck],
  )

  const toggle = useCallback(
    (at: number) => {
      const slide = deck[at]
      if (api && slide) writeSlideSettings(api, toggledSlide(slide))
    },
    [api, deck],
  )

  return {
    deck,
    contentVersion,
    presenting: current ? { index, total: slides.length } : null,
    live: {
      offered: roomPresentation && !following ? roomPresentation : null,
      following: following ? roomPresentation : null,
      broadcasting,
    },
    onScene,
    presentToEveryone,
    follow,
    start,
    stop,
    move,
    toggle,
  }
}
