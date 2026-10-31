import type { Plugin } from 'vite'

const CDN_FALLBACK = /("ASSETS_FALLBACK_URL",\s*)`https:\/\/esm\.sh\//g

const SAME_ORIGIN_FALLBACK = '$1`${window.location.origin}/'

const EDITOR_PACKAGE = '@excalidraw/excalidraw/dist/'

export function rewriteFontFallback(code: string): { code: string; rewritten: boolean } {
  const rewrittenCode = code.replace(CDN_FALLBACK, SAME_ORIGIN_FALLBACK)
  return { code: rewrittenCode, rewritten: rewrittenCode !== code }
}

export function selfHostedEditorFonts(): Plugin {
  let rewritten = false

  return {
    name: 'self-hosted-editor-fonts',
    apply: 'build',
    transform(code, id) {
      if (!id.includes(EDITOR_PACKAGE)) return null
      const result = rewriteFontFallback(code)
      if (!result.rewritten) return null
      rewritten = true
      return { code: result.code, map: null }
    },
    buildEnd(error) {
      if (!error && !rewritten) {
        this.error(
          'The Excalidraw editor no longer contains its esm.sh font fallback, so the self-hosted rewrite did nothing. Check how this editor version finds its fonts before shipping it.',
        )
      }
    },
  }
}
