import { useEffect, useState } from 'react'
import { type SlideItem, SlidesList } from '@/components/scenes/slides-list'
import type { Slide } from './deck'
import type { EditorApi } from './files'
import { slideThumbnail } from './slides'

export function SlidesPanel({
  api,
  open,
  deck,
  contentVersion,
  canEdit,
  onMove,
  onToggle,
  onPresent,
  onPresentToEveryone,
  presenterElsewhere,
  onExport,
}: {
  api: EditorApi | null
  open: boolean
  deck: Slide[]
  contentVersion: number
  canEdit: boolean
  onMove: (from: number, to: number) => void
  onToggle: (index: number) => void
  onPresent: (slideId?: string) => void
  onPresentToEveryone: () => void
  presenterElsewhere?: string
  onExport: () => void
}) {
  const [thumbnails, setThumbnails] = useState<ReadonlyMap<string, string>>(new Map())

  const frameIds = deck.map(({ frame }) => frame.id).join(',')

  useEffect(() => {
    if (!api || !open) return
    let cancelled = false
    void (async () => {
      const next = new Map<string, string>()
      for (const frameId of frameIds.split(',').filter(Boolean)) {
        const png = await slideThumbnail(api, frameId).catch(() => undefined)
        if (cancelled) break
        if (png) next.set(frameId, URL.createObjectURL(png))
      }
      if (cancelled) next.forEach((url) => URL.revokeObjectURL(url))
      else setThumbnails(next)
    })()
    return () => {
      cancelled = true
    }
  }, [api, frameIds, contentVersion, open])

  useEffect(() => () => thumbnails.forEach((url) => URL.revokeObjectURL(url)), [thumbnails])

  const slides: SlideItem[] = deck.map(({ frame, included }, index) => ({
    id: frame.id,
    name: typeof frame.name === 'string' && frame.name ? frame.name : `Frame ${index + 1}`,
    included,
    thumbnail: thumbnails.get(frame.id),
  }))

  return (
    <SlidesList
      slides={slides}
      canEdit={canEdit}
      onMove={onMove}
      onToggle={onToggle}
      onPresent={onPresent}
      onPresentToEveryone={onPresentToEveryone}
      presenterElsewhere={presenterElsewhere}
      onExport={onExport}
    />
  )
}
