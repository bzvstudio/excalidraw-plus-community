import { ArrowDownIcon, ArrowUpIcon, DownloadIcon, EyeIcon, EyeOffIcon, FrameIcon, GripVerticalIcon, RadioIcon } from 'lucide-react'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/ui/empty-state'
import { NO_SLIDES } from '@/constants/slides'
import { cn } from '@/lib/utils'

export type SlideItem = {
  id: string
  name: string
  included: boolean
  thumbnail?: string
}

export function SlidesList({
  slides,
  canEdit,
  onMove,
  onToggle,
  onPresent,
  onPresentToEveryone,
  presenterElsewhere,
  onExport,
}: {
  slides: SlideItem[]
  canEdit: boolean
  onMove: (from: number, to: number) => void
  onToggle: (index: number) => void
  onPresent: (slideId?: string) => void
  onPresentToEveryone: () => void
  presenterElsewhere?: string
  onExport: () => void
}) {
  const [dragging, setDragging] = useState<number>()
  const [over, setOver] = useState<number>()
  const anyIncluded = slides.some((slide) => slide.included)

  const exportButton = (
    <Button size="sm" variant="outline" onClick={onExport}>
      <DownloadIcon aria-hidden />
      Export
    </Button>
  )

  if (slides.length === 0) {
    return <EmptyState icon={FrameIcon} title="No slides yet" description={NO_SLIDES} action={exportButton} />
  }

  const included = slides.filter((slide) => slide.included).length

  return (
    <div className="flex flex-col gap-3 p-3">
      <div className="flex gap-2">
        <Button
          size="sm"
          variant="outline"
          className="flex-1"
          onClick={onPresentToEveryone}
          disabled={!anyIncluded || presenterElsewhere !== undefined}
        >
          <RadioIcon aria-hidden />
          Present to everyone
        </Button>
        {exportButton}
      </div>
      {presenterElsewhere !== undefined && (
        <p className="rounded-lg bg-info px-3 py-2 text-xs text-info-foreground">{presenterElsewhere} is presenting to everyone.</p>
      )}
      <p className="px-0.5 text-xs text-muted-foreground tabular-nums">
        {included === slides.length
          ? `${slides.length} ${slides.length === 1 ? 'slide' : 'slides'}`
          : `${included} of ${slides.length} slides shown`}
        {canEdit && slides.length > 1 && ' · drag to reorder'}
      </p>
      <ol className="flex flex-col gap-2" aria-label="Slides">
        {slides.map((slide, index) => (
          <li
            key={slide.id}
            draggable={canEdit}
            onDragStart={() => setDragging(index)}
            onDragOver={(event) => {
              if (!canEdit) return
              event.preventDefault()
              setOver(index)
            }}
            onDragLeave={() => setOver((current) => (current === index ? undefined : current))}
            onDrop={() => {
              if (dragging !== undefined && dragging !== index) onMove(dragging, index)
              setDragging(undefined)
              setOver(undefined)
            }}
            onDragEnd={() => {
              setDragging(undefined)
              setOver(undefined)
            }}
            className={cn(
              'group/slide rounded-xl border bg-background p-1.5 transition-colors duration-150 motion-reduce:transition-none',
              dragging === index && 'opacity-60',
              over === index && dragging !== index && 'border-brand',
            )}
          >
            <button
              type="button"
              className="block w-full rounded-lg text-left outline-none focus-visible:ring-3 focus-visible:ring-ring disabled:cursor-not-allowed"
              onClick={() => onPresent(slide.id)}
              disabled={!slide.included}
              aria-label={`Present from ${index + 1}. ${slide.name}`}
            >
              <div
                className={cn(
                  'grid aspect-video place-items-center overflow-hidden rounded-lg bg-muted dark:[&_img]:invert dark:[&_img]:hue-rotate-180',
                  !slide.included && 'opacity-40',
                )}
              >
                {slide.thumbnail && <img src={slide.thumbnail} alt="" className="max-h-full max-w-full" />}
              </div>
            </button>
            <div className="flex h-8 items-center gap-1 pl-1">
              {canEdit && <GripVerticalIcon aria-hidden className="size-3.5 shrink-0 cursor-grab text-muted-foreground/60" />}
              <span data-slide-title className={cn('min-w-0 flex-1 truncate text-xs font-medium', !slide.included && 'text-muted-foreground line-through')}>
                {index + 1}. {slide.name}
              </span>
              {!slide.included && <span className="sr-only"> (left out)</span>}
              {canEdit && (
                <span className="flex shrink-0 gap-0.5">
                  <Button
                    variant="ghost"
                    size="icon-xs"
                    className="text-muted-foreground hover:text-foreground"
                    onClick={() => onToggle(index)}
                    aria-label={slide.included ? `Leave ${slide.name} out` : `Put ${slide.name} back in`}
                  >
                    {slide.included ? <EyeIcon aria-hidden /> : <EyeOffIcon aria-hidden />}
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon-xs"
                    className="text-muted-foreground hover:text-foreground"
                    onClick={() => onMove(index, index - 1)}
                    disabled={index === 0}
                    aria-label={`Move ${slide.name} up`}
                  >
                    <ArrowUpIcon aria-hidden />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon-xs"
                    className="text-muted-foreground hover:text-foreground"
                    onClick={() => onMove(index, index + 1)}
                    disabled={index === slides.length - 1}
                    aria-label={`Move ${slide.name} down`}
                  >
                    <ArrowDownIcon aria-hidden />
                  </Button>
                </span>
              )}
            </div>
          </li>
        ))}
      </ol>
    </div>
  )
}
