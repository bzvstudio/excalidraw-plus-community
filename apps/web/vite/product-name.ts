import type { Plugin } from 'vite'

export const PRODUCT_NAME_PLACEHOLDER = '%PRODUCT_NAME%'

export function fillProductName(html: string, productName: string): string {
  return html.replaceAll(PRODUCT_NAME_PLACEHOLDER, productName)
}

export function productName(name: string): Plugin {
  return {
    name: 'product-name',
    transformIndexHtml: { order: 'pre', handler: (html) => fillProductName(html, name) },
  }
}
