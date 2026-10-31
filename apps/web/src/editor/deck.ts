import type { SceneElement } from '@repo/api'

export type SlideSettings = {
  position?: number
  skip?: boolean
}

export type SlidePatch = { position?: number; skip?: true | undefined }

export type Slide = {
  frame: SceneElement
  included: boolean
}

const SLIDE_TYPES = ['frame', 'magicframe']

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value)
}

function numberOf(value: unknown): number {
  return isFiniteNumber(value) ? value : 0
}

export function slideSettingsOf(frame: SceneElement): SlideSettings {
  const slide = (frame.customData as { slide?: unknown } | undefined)?.slide
  if (typeof slide !== 'object' || slide === null) return {}
  const { position, skip } = slide as Record<string, unknown>
  return {
    ...(isFiniteNumber(position) && { position }),
    ...(skip === true && { skip }),
  }
}

function inReadingOrder(a: SceneElement, b: SceneElement): number {
  return numberOf(a.y) - numberOf(b.y) || numberOf(a.x) - numberOf(b.x) || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0)
}

type Placed = { frame: SceneElement; settings: SlideSettings }

function inDeckOrder(a: Placed, b: Placed): number {
  const first = a.settings.position
  const second = b.settings.position
  if (first !== undefined && second !== undefined && first !== second) return first - second
  if ((first === undefined) !== (second === undefined)) return first === undefined ? 1 : -1
  return inReadingOrder(a.frame, b.frame)
}

export function deckOf(elements: readonly SceneElement[]): Slide[] {
  return elements
    .filter((element) => !element.isDeleted && SLIDE_TYPES.includes(element.type))
    .map((frame) => ({ frame, settings: slideSettingsOf(frame) }))
    .sort(inDeckOrder)
    .map(({ frame, settings }) => ({ frame, included: !settings.skip }))
}

export function slidesOf(deck: readonly Slide[]): SceneElement[] {
  return deck.filter((slide) => slide.included).map((slide) => slide.frame)
}

export function movedSlide(deck: readonly Slide[], from: number, to: number): Map<string, SlidePatch> {
  const order = [...deck]
  const [moved] = order.splice(from, 1)
  if (moved) order.splice(to, 0, moved)
  return new Map(
    order.flatMap((slide, position) =>
      slideSettingsOf(slide.frame).position === position ? [] : [[slide.frame.id, { position }] as const],
    ),
  )
}

export function toggledSlide(slide: Slide): Map<string, SlidePatch> {
  return new Map([[slide.frame.id, { skip: slide.included ? true : undefined }]])
}

export function patchedSlide(current: SlideSettings, patch: SlidePatch): SlideSettings {
  const next = { ...current, ...patch }
  if (next.skip !== true) delete next.skip
  return next
}
