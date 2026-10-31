import { createRootRoute } from '@tanstack/react-router'
import { pageTitle } from '@/helpers/places'
import { NotFoundPage } from '@/routes/not-found'
import { RootLayout } from '@/routes/root-layout'
import { loadRuntimeConfig } from '@/services/config/config'

export const Route = createRootRoute({
  beforeLoad: () => loadRuntimeConfig(),
  head: ({ match }) => ({ meta: [{ title: pageTitle(match.context.productName) }] }),
  component: RootLayout,
  notFoundComponent: NotFoundPage,
})
