import { useCallback, useEffect, useRef } from 'react'
import { renderThumbnail, type ThumbnailSource } from '@/editor/thumbnail'

const THUMBNAIL_INTERVAL_MS = 60_000

export function useThumbnail(upload: ((png: Blob) => Promise<unknown>) | undefined) {
  const latest = useRef<ThumbnailSource | undefined>(undefined)
  const changed = useRef(false)
  const lastSent = useRef(0)
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const unmounted = useRef(false)

  const send = useCallback(async () => {
    timer.current = undefined
    const source = latest.current
    if (!changed.current || !source || !upload) return
    changed.current = false
    lastSent.current = Date.now()
    const png = await renderThumbnail(source).catch(() => undefined)
    if (png) await upload(png).catch(() => undefined)
  }, [upload])

  const track = useCallback((source: ThumbnailSource) => {
    latest.current = source
  }, [])

  const onSaved = useCallback(() => {
    changed.current = true
    if (unmounted.current) return void send()
    timer.current ??= setTimeout(() => void send(), Math.max(0, lastSent.current + THUMBNAIL_INTERVAL_MS - Date.now()))
  }, [send])

  useEffect(() => {
    unmounted.current = false
    return () => {
      unmounted.current = true
      clearTimeout(timer.current)
      void send()
    }
  }, [send])

  return { track, onSaved }
}
