import { GripHorizontalIcon, MonitorIcon } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import type { CallScreen } from '@/services/calls/call-session'

const START = { x: 16, y: 72 }

export function ScreenPanel({ screen }: { screen: CallScreen }) {
  const video = useRef<HTMLVideoElement>(null)
  const [position, setPosition] = useState(START)
  const drag = useRef<{ x: number; y: number } | null>(null)

  useEffect(() => (video.current ? screen.attach(video.current) : undefined), [screen])

  return (
    <section
      aria-label={`Screen shared by ${screen.sharedBy}`}
      className="absolute z-10 w-[min(480px,calc(100%-32px))] overflow-hidden rounded-xl bg-popover text-popover-foreground shadow-float duration-200 animate-in fade-in-0 zoom-in-95 motion-reduce:animate-none"
      style={{ left: position.x, top: position.y }}
    >
      <div
        className="flex h-9 cursor-move touch-none items-center gap-2 border-b px-3 text-xs text-muted-foreground select-none"
        onPointerDown={(event) => {
          event.currentTarget.setPointerCapture(event.pointerId)
          drag.current = { x: event.clientX - position.x, y: event.clientY - position.y }
        }}
        onPointerMove={(event) => {
          if (drag.current) setPosition({ x: event.clientX - drag.current.x, y: event.clientY - drag.current.y })
        }}
        onPointerUp={() => {
          drag.current = null
        }}
      >
        <MonitorIcon aria-hidden className="size-3.5" />
        <span className="flex-1 truncate">
          {screen.sharedBy === 'You' ? 'You are sharing your screen' : `${screen.sharedBy} is sharing their screen`}
        </span>
        <GripHorizontalIcon aria-hidden className="size-4 opacity-60" />
      </div>
      <video ref={video} className="block aspect-video w-full bg-black" autoPlay playsInline muted />
    </section>
  )
}
