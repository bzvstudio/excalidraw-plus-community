import path from 'node:path'
import { API_PATHS, DEFAULT_API_PORT, PRODUCT_NAME, SOCKET_PATH } from '@repo/api/system.const'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { viteStaticCopy } from 'vite-plugin-static-copy'
import { productName } from './vite/product-name.ts'
import { preloadInterfaceFont } from './vite/preload-interface-font.ts'
import { selfHostedEditorFonts } from './vite/self-hosted-editor-fonts.ts'
import { defineConfig } from 'vitest/config'

// Overridable so several checkouts can run at once; see .conductor/workspace.sh.
const WEB_PORT = Number(process.env.WEB_PORT ?? 5176)

const EDITOR_DIST = 'node_modules/@excalidraw/excalidraw/dist/prod'

const API_ORIGIN = `http://localhost:${process.env.PORT ?? DEFAULT_API_PORT}`

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    selfHostedEditorFonts(),
    productName(PRODUCT_NAME),
    preloadInterfaceFont(),
    viteStaticCopy({
      targets: [{ src: `${EDITOR_DIST}/fonts`, dest: '' }],
    }),
  ],
  resolve: {
    alias: {
      '@': path.resolve(import.meta.dirname, './src'),
    },
  },
  server: {
    port: WEB_PORT,
    strictPort: true,
    proxy: Object.fromEntries(
      API_PATHS.map((prefix) => [
        prefix,
        { target: API_ORIGIN, changeOrigin: true, ws: prefix === SOCKET_PATH },
      ]),
    ),
  },
  preview: {
    port: WEB_PORT,
    strictPort: true,
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
  },
})
