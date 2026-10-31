import { Button } from '@/components/ui/button'

export function PresentationOffer({ presenter, onFollow }: { presenter: string; onFollow: () => void }) {
  return (
    <span className="flex h-8 items-center gap-2 rounded-full border bg-background py-0.5 pr-0.5 pl-2.5 text-xs duration-200 animate-in fade-in-0 slide-in-from-top-1 motion-reduce:animate-none">
      <span aria-hidden className="relative flex size-2">
        <span className="absolute inline-flex size-full animate-ping rounded-full bg-brand opacity-60 motion-reduce:animate-none" />
        <span className="relative inline-flex size-2 rounded-full bg-brand" />
      </span>
      <span className="max-w-40 truncate max-md:sr-only">
        <span className="font-medium">{presenter}</span> is presenting
      </span>
      <Button size="xs" className="rounded-full" onClick={onFollow}>
        Follow
      </Button>
    </span>
  )
}
