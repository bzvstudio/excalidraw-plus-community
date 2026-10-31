import type { CommentAnchor } from '@repo/api'
import { type ReactNode, useEffect, useReducer } from 'react'
import { anchorPoint } from '@repo/api/comments.utils'
import { cn } from '@/lib/utils'
import { inScene, onScreen, onViewChange, sceneElementsById } from './comments'
import type { EditorApi } from './files'
import { COMMENT_LAYER } from './layers'

export type CommentPin = { id: string; anchor: CommentAnchor; label: string }

const CARD_GAP = 12
const CARD_WIDTH = 320
const CARD_HEIGHT = 360

export function CommentLayer({
  api,
  pins,
  selectedId,
  card,
  placing,
  onSelect,
  onPlace,
  onCancelPlacing,
}: {
  api: EditorApi | null
  pins: CommentPin[]
  selectedId?: string
  card?: { anchor: CommentAnchor; content: ReactNode }
  placing: boolean
  onSelect: (id: string) => void
  onPlace: (point: { x: number; y: number }) => void
  onCancelPlacing: () => void
}) {
  const [, redraw] = useReducer((count: number) => count + 1, 0)
  const shown = pins.length > 0 || card !== undefined || placing

  useEffect(() => {
    if (!api || !shown) return
    let frame = 0
    const off = onViewChange(api, () => {
      cancelAnimationFrame(frame)
      frame = requestAnimationFrame(redraw)
    })
    return () => {
      off()
      cancelAnimationFrame(frame)
    }
  }, [api, shown])

  useEffect(() => {
    if (!placing) return
    const onKey = (event: KeyboardEvent) => event.key === 'Escape' && onCancelPlacing()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [placing, onCancelPlacing])

  if (!api || !shown) return null
  const elements = sceneElementsById(api)
  const { offsetLeft, offsetTop, width, height } = api.getAppState()
  const place = (anchor: CommentAnchor) => {
    const at = onScreen(api, anchorPoint(anchor, elements))
    return { x: at.x - offsetLeft, y: at.y - offsetTop }
  }
  const cardAt = card && place(card.anchor)

  return (
    <div className={cn('pointer-events-none absolute inset-0 overflow-hidden', COMMENT_LAYER)}>
      {placing && (
        <div
          role="button"
          tabIndex={0}
          aria-label="Place a comment: click where it goes, or press Enter for the middle of the screen"
          className="pointer-events-auto absolute inset-0 cursor-crosshair"
          ref={(layer) => layer?.focus()}
          onClick={(event) => onPlace(inScene(api, { x: event.clientX, y: event.clientY }))}
          onKeyDown={(event) => {
            if (event.key !== 'Enter' && event.key !== ' ') return
            event.preventDefault()
            onPlace(inScene(api, { x: offsetLeft + width / 2, y: offsetTop + height / 2 }))
          }}
        />
      )}
      {pins.map((pin) => {
        const at = place(pin.anchor)
        return (
          <button
            key={pin.id}
            type="button"
            aria-label={`Comment thread ${pin.label}`}
            onClick={() => onSelect(pin.id)}
            style={{ left: at.x, top: at.y }}
            className={cn(
              'pointer-events-auto absolute flex size-7 -translate-y-full items-center justify-center rounded-full rounded-bl-none border-2 border-background bg-primary text-xs font-semibold text-primary-foreground shadow-float outline-none tabular-nums transition-transform duration-150 hover:scale-110 focus-visible:ring-3 focus-visible:ring-ring motion-reduce:transition-none',
              selectedId === pin.id && 'scale-110 ring-3 ring-brand/60',
            )}
          >
            {pin.label}
          </button>
        )
      })}
      {card && cardAt && (
        <div
          className="pointer-events-auto absolute"
          style={{
            left: Math.max(Math.min(cardAt.x + CARD_GAP, width - CARD_WIDTH - CARD_GAP), CARD_GAP),
            top: Math.max(Math.min(cardAt.y - CARD_GAP, height - CARD_HEIGHT - CARD_GAP), CARD_GAP),
          }}
        >
          {card.content}
        </div>
      )}
    </div>
  )
}
