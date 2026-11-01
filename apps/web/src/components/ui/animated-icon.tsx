import type { IconHandle } from '@animateicons/react'
import { type ComponentType, type Ref, useEffect, useRef } from 'react'
import { cn } from '@/lib/utils'

const ROW_SELECTOR = 'a, button, [role^="menuitem"]'

export type AnimatableIcon = ComponentType<{ ref?: Ref<IconHandle>; size?: number }>

export function AnimatedIcon({
  icon: Icon,
  size = 16,
  className,
  active,
}: {
  icon: AnimatableIcon
  size?: number
  className?: string
  active?: boolean
}) {
  const icon = useRef<IconHandle>(null)
  const anchor = useRef<HTMLSpanElement>(null)
  const animating = useRef(false)
  const controlled = active !== undefined

  useEffect(() => {
    if (active === undefined || active === animating.current) return
    animating.current = active
    if (active) icon.current?.startAnimation()
    else icon.current?.stopAnimation()
  }, [active])

  useEffect(() => {
    if (animating.current) icon.current?.startAnimation()
  }, [Icon])

  useEffect(() => {
    if (controlled) return
    const row = anchor.current?.closest<HTMLElement>(ROW_SELECTOR)
    if (!row) return
    let hovered = false
    let focused = false
    const update = (nextHovered: boolean, nextFocused: boolean) => {
      const wasActive = hovered || focused
      hovered = nextHovered
      focused = nextFocused
      const active = hovered || focused
      animating.current = active
      if (active && !wasActive) icon.current?.startAnimation()
      if (!active && wasActive) icon.current?.stopAnimation()
    }
    const enter = () => update(true, focused)
    const leave = () => update(false, focused)
    const focus = () => update(hovered, true)
    const blur = () => update(hovered, false)
    row.addEventListener('pointerenter', enter)
    row.addEventListener('pointerleave', leave)
    row.addEventListener('focusin', focus)
    row.addEventListener('focusout', blur)
    return () => {
      row.removeEventListener('pointerenter', enter)
      row.removeEventListener('pointerleave', leave)
      row.removeEventListener('focusin', focus)
      row.removeEventListener('focusout', blur)
    }
  }, [controlled])

  return (
    <span ref={anchor} aria-hidden className={cn('inline-flex shrink-0', className)}>
      <Icon ref={icon} size={size} />
    </span>
  )
}
