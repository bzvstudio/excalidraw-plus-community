import { FileTextIcon, PresentationIcon } from 'lucide-react'
import { useId, useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Switch } from '@/components/ui/switch'
import type { DeckFormat } from '@/helpers/deck-file'

export type DeckExport = { format: DeckFormat; dark: boolean; background: boolean }

const FORMATS: { value: DeckFormat; label: string; detail: string; icon: typeof FileTextIcon }[] = [
  { value: 'pdf', label: 'PDF', detail: 'One page per slide, for reading or printing.', icon: FileTextIcon },
  { value: 'pptx', label: 'PowerPoint (.pptx)', detail: 'One slide per page, to present from Keynote, Slides or PowerPoint.', icon: PresentationIcon },
]

function summary(frameCount: number, slideCount: number): string {
  if (frameCount === 0) return 'This scene has no frames, so the whole drawing becomes a single page.'
  if (slideCount === 0) return 'Every slide is left out of the deck. Put one back in to export it.'
  return slideCount === 1 ? 'The one slide becomes a page.' : `Each of the ${slideCount} slides becomes a page, in the deck's order.`
}

export function ExportDeckDialog({
  frameCount,
  slideCount,
  dark,
  onClose,
  onExport,
}: {
  frameCount: number
  slideCount: number
  dark: boolean
  onClose: () => void
  onExport: (choice: DeckExport) => Promise<void>
}) {
  const id = useId()
  const [choice, setChoice] = useState<DeckExport>({ format: 'pdf', dark, background: true })
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string>()

  const submit = async (event: React.FormEvent) => {
    event.preventDefault()
    setBusy(true)
    setError(undefined)
    try {
      await onExport(choice)
      onClose()
    } catch (failure) {
      console.error(failure)
      setError('The file could not be made. Try again, or with fewer or smaller frames.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <Dialog open onOpenChange={(open) => !open && !busy && onClose()}>
      <DialogContent data-prevent-outside-click className="sm:max-w-lg">
        <form onSubmit={submit} className="flex flex-col gap-5">
          <DialogHeader>
            <DialogTitle>Export slides</DialogTitle>
            <DialogDescription>
              {summary(frameCount, slideCount)} Pages are pictures of the drawing: shapes cannot be edited in PowerPoint.
            </DialogDescription>
          </DialogHeader>
          <fieldset className="flex flex-col gap-2">
            <legend className="mb-2 text-sm font-medium">Format</legend>
            {FORMATS.map((format) => (
              <label
                key={format.value}
                className="flex cursor-pointer items-start gap-3 rounded-lg border px-3 py-2.5 transition-colors duration-150 hover:bg-accent/60 has-checked:border-foreground/30 has-checked:bg-accent has-focus-visible:ring-3 has-focus-visible:ring-ring motion-reduce:transition-none"
              >
                <input
                  type="radio"
                  name="format"
                  className="mt-0.5 size-4 shrink-0 accent-foreground outline-none"
                  checked={choice.format === format.value}
                  onChange={() => setChoice({ ...choice, format: format.value })}
                  aria-labelledby={`${id}-${format.value}`}
                  aria-describedby={`${id}-${format.value}-detail`}
                />
                <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                  <span id={`${id}-${format.value}`} className="text-sm font-medium">
                    {format.label}
                  </span>
                  <span id={`${id}-${format.value}-detail`} className="text-xs text-muted-foreground">
                    {format.detail}
                  </span>
                </span>
                <format.icon aria-hidden className="size-4 shrink-0 text-muted-foreground" />
              </label>
            ))}
          </fieldset>
          <fieldset className="flex flex-col divide-y rounded-lg border">
            <legend className="sr-only">Look</legend>
            <label className="flex cursor-pointer items-center justify-between gap-3 px-3 py-2.5 text-sm">
              <span className="flex flex-col gap-0.5">
                <span className="font-medium">Background</span>
                <span className="text-xs text-muted-foreground">Keep the canvas colour behind each slide.</span>
              </span>
              <Switch
                aria-label="Background"
                checked={choice.background}
                onChange={() => setChoice({ ...choice, background: !choice.background })}
              />
            </label>
            <label className="flex cursor-pointer items-center justify-between gap-3 px-3 py-2.5 text-sm">
              <span className="flex flex-col gap-0.5">
                <span className="font-medium">Dark theme</span>
                <span className="text-xs text-muted-foreground">Draw the slides as the dark canvas shows them.</span>
              </span>
              <Switch aria-label="Dark theme" checked={choice.dark} onChange={() => setChoice({ ...choice, dark: !choice.dark })} />
            </label>
          </fieldset>
          {error && (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          )}
          <DialogFooter>
            <DialogClose render={<Button type="button" variant="ghost" disabled={busy} />}>Cancel</DialogClose>
            <Button type="submit" disabled={busy || (frameCount > 0 && slideCount === 0)}>
              {busy ? 'Making the file…' : 'Download'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
