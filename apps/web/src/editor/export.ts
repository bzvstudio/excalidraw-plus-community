import { fitted, type PageImage } from '@/helpers/deck-file'
import { dataUrlOf } from './files'

const POINTS_PER_PIXEL = 72 / 96
const SLIDE_WIDTH_INCHES = 10
const SLIDE_HEIGHT_INCHES = 5.625
const DOWNLOAD_URL_LIFETIME_MS = 60_000

export function preloadDeckFiles() {
  void import('pdf-lib')
  void import('pptxgenjs')
}

export async function pdfOf(pages: readonly PageImage[]): Promise<Blob> {
  const { PDFDocument } = await import('pdf-lib')
  const pdf = await PDFDocument.create()
  for (const page of pages) {
    const image = await pdf.embedPng(new Uint8Array(await page.png.arrayBuffer()))
    const width = page.width * POINTS_PER_PIXEL
    const height = page.height * POINTS_PER_PIXEL
    pdf.addPage([width, height]).drawImage(image, { x: 0, y: 0, width, height })
  }
  return new Blob([(await pdf.save()) as Uint8Array<ArrayBuffer>], { type: 'application/pdf' })
}

export async function pptxOf(pages: readonly PageImage[]): Promise<Blob> {
  const { default: PptxGenJS } = await import('pptxgenjs')
  const pptx = new PptxGenJS()
  pptx.layout = 'LAYOUT_16x9'
  for (const page of pages) {
    const place = fitted(page, { width: SLIDE_WIDTH_INCHES, height: SLIDE_HEIGHT_INCHES })
    pptx.addSlide().addImage({ data: await dataUrlOf(page.png), x: place.x, y: place.y, w: place.width, h: place.height })
  }
  return (await pptx.write({ outputType: 'blob' })) as Blob
}

export function saveFile(file: Blob, name: string) {
  const url = URL.createObjectURL(file)
  const link = document.createElement('a')
  link.href = url
  link.download = name
  link.click()
  setTimeout(() => URL.revokeObjectURL(url), DOWNLOAD_URL_LIFETIME_MS)
}
