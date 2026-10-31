type PageChunk =
  | { type: 'content'; delta: string }
  | { type: 'done'; finishReason: string | null }
  | { type: 'error'; error: { message: string } }

export const PAGE_TOO_LONG = 'The page was too long to finish. Try a simpler frame, or split it into several.'
export const PAGE_CUT_OFF = 'The connection closed before the page was finished. Try again.'

export async function collectPage(events: AsyncIterable<string>, onPartial?: (html: string) => void): Promise<string> {
  let html = ''
  for await (const data of events) {
    const chunk = JSON.parse(data) as PageChunk
    if (chunk.type === 'error') throw new Error(chunk.error.message)
    if (chunk.type === 'done') {
      if (chunk.finishReason === 'length') throw new Error(PAGE_TOO_LONG)
      return html
    }
    html += chunk.delta
    onPartial?.(html)
  }
  throw new Error(PAGE_CUT_OFF)
}
