export type PageImage = {
  png: Blob
  width: number
  height: number
}

export type DeckFormat = 'pdf' | 'pptx'

const PAGE_SCALE = 2
const MAX_PAGE_PIXELS = 16_000_000

export function pageScale(width: number, height: number): number {
  return Math.min(PAGE_SCALE, Math.sqrt(MAX_PAGE_PIXELS / (width * height)))
}

export function fitted(page: Pick<PageImage, 'width' | 'height'>, box: { width: number; height: number }) {
  const scale = Math.min(box.width / page.width, box.height / page.height)
  const width = page.width * scale
  const height = page.height * scale
  return { x: (box.width - width) / 2, y: (box.height - height) / 2, width, height }
}

export function deckFileName(title: string, format: DeckFormat): string {
  const name = [...title]
    .filter((character) => character.charCodeAt(0) >= 32)
    .join('')
    .replace(/[\\/:*?"<>|]+/g, '-')
    .replace(/^[\s.]+|[\s.]+$/g, '')
  return `${name || 'Slides'}.${format}`
}
