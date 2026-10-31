import type { Plugin } from 'vite'

const INTERFACE_FONT = /(^|\/)inter-latin-wght-normal-[\w-]+\.woff2$/

export function interfaceFontFile(fileNames: readonly string[]): string | undefined {
  return fileNames.find((name) => INTERFACE_FONT.test(name))
}

export function preloadLink(href: string): string {
  return `<link rel="preload" href="${href}" as="font" type="font/woff2" crossorigin>`
}

export function preloadInterfaceFont(): Plugin {
  return {
    name: 'preload-interface-font',
    apply: 'build',
    transformIndexHtml: {
      order: 'post',
      handler(html, context) {
        const file = interfaceFontFile(Object.keys(context.bundle ?? {}))
        if (!file) throw new Error('The build holds no Latin Inter font to preload.')
        return html.replace('</title>', `</title>\n    ${preloadLink(`/${file}`)}`)
      },
    },
  }
}
