import {
  createRoute,
  createRouter,
  lazyRouteComponent,
  notFound,
  Outlet,
  redirect,
  type RouterHistory,
} from '@tanstack/react-router'
import { RESET_PASSWORD_PATH } from '@repo/api/auth.const'
import { ACCOUNT_PATH, CREATE_WORKSPACE_PATH } from '@/constants/routes'
import { legacyHref } from '@/helpers/legacy-addresses'
import { pageTitle, placeLink, workspaceLink } from '@/helpers/places'
import { homeWorkspace, lastWorkspaceId } from '@/helpers/last-workspace'
import { DRAFTS } from '@repo/api/scenes.const'
import { loadCollection } from '@/services/collections/collections'
import { AuthFrame } from '@/components/auth/auth-frame'
import { Route as rootRoute } from '@/routes/__root.tsx'
import { ForgotPasswordRoute } from '@/routes/external/forgot-password/forgot-password.tsx'
import { InviteRoute } from '@/routes/external/invite/invite.tsx'
import { LinkRoute } from '@/routes/external/link/link.tsx'
import { SharedUnavailable } from '@/routes/external/shared/shared-unavailable.tsx'
import { ResetPasswordRoute } from '@/routes/external/reset-password/reset-password.tsx'
import { SetupRoute } from '@/routes/external/setup/setup.tsx'
import { SignInRoute } from '@/routes/external/sign-in/sign-in.tsx'
import { SignUpRoute } from '@/routes/external/sign-up/sign-up.tsx'
import { MembersRoute } from '@/routes/internal/members/members.tsx'
import { OnboardingRoute } from '@/routes/internal/onboarding/onboarding.tsx'
import { CollectionScenesRoute, DraftsRoute } from '@/routes/internal/scenes/scenes.tsx'
import { ActivityRoute } from '@/routes/internal/activity/activity.tsx'
import { HomeRoute } from '@/routes/internal/home/home.tsx'
import { MyWorkspacesRoute } from '@/routes/internal/my-workspaces/my-workspaces.tsx'
import { PreferencesRoute } from '@/routes/internal/preferences/preferences.tsx'
import { SettingsRoute } from '@/routes/internal/settings/settings.tsx'
import { WorkspaceSettingsRoute } from '@/routes/internal/workspace-settings/workspace-settings.tsx'
import { AiSettingsRoute } from '@/routes/internal/ai-settings/ai-settings.tsx'
import { ApiKeysRoute, CreateApiKeyRoute } from '@/routes/internal/api-keys/api-keys.tsx'
import { AuditRoute } from '@/routes/internal/audit/audit.tsx'
import { TeamsRoute } from '@/routes/internal/teams/teams.tsx'
import { WorkspaceRoute } from '@/routes/internal/workspace/workspace.tsx'
import { loadSession } from '@/services/auth/session'
import { loadRuntimeConfig } from '@/services/config/config'
import { SceneNotFound, SceneUnavailable } from '@/routes/internal/scene/scene-unavailable.tsx'
import { loadScene } from '@/services/scenes/scenes'
import { auditLogQuery } from '@/services/audit/audit'
import { loadSharedScene } from '@/services/shares/shares'
import { loadWorkspace, loadWorkspaces } from '@/services/workspaces/workspaces'
import { canEditScenes, canManageWorkspace } from '@/helpers/roles'
import { settingsPage } from '@/helpers/settings-pages'
import type { SettingsPageId } from '@/constants/settings'
import { preload, queryClient, trpc } from '@/trpc'
import { validateActivitySearch } from '@/helpers/activity'
import type { Principal } from '@/types/api'
import type { WorkspaceSummary } from '@repo/api'

async function goHome(principal: Principal): Promise<never> {
  const home = homeWorkspace(await loadWorkspaces(), lastWorkspaceId(principal.userId))
  throw home ? redirect({ ...workspaceLink(home.slug), replace: true }) : redirect({ href: CREATE_WORKSPACE_PATH, replace: true })
}

async function leaveIfSignedInOrUnclaimed() {
  if ((await loadRuntimeConfig()).setupRequired) throw redirect({ to: '/setup', replace: true })
  const principal = await loadSession()
  if (principal) await goHome(principal)
}

function signInSearch(search: Record<string, unknown>): { redirect?: string; error?: string } {
  return {
    ...(typeof search.redirect === 'string' && { redirect: search.redirect }),
    ...(typeof search.error === 'string' && { error: search.error }),
  }
}

function moveOldAddress({ location }: { location: { pathname: string; searchStr: string; hash: string } }): never {
  throw redirect({ href: legacyHref(location), replace: true })
}

const externalRoute = createRoute({
  getParentRoute: () => rootRoute,
  id: 'external',
  component: Outlet,
})

const authFrameRoute = createRoute({
  getParentRoute: () => externalRoute,
  id: 'auth',
  component: AuthFrame,
})

const landingRoute = createRoute({
  getParentRoute: () => authFrameRoute,
  path: '/',
  head: ({ match }) => titled(match.context, 'Sign in'),
  validateSearch: signInSearch,
  beforeLoad: leaveIfSignedInOrUnclaimed,
  component: SignInRoute,
})

const setupRoute = createRoute({
  getParentRoute: () => authFrameRoute,
  path: '/setup',
  head: ({ match }) => titled(match.context, 'Set up'),
  beforeLoad: async () => {
    if (!(await loadRuntimeConfig()).setupRequired) throw redirect({ to: '/' })
  },
  component: SetupRoute,
})

const signInRoute = createRoute({
  getParentRoute: () => authFrameRoute,
  path: '/sign-in',
  head: ({ match }) => titled(match.context, 'Sign in'),
  validateSearch: signInSearch,
  beforeLoad: leaveIfSignedInOrUnclaimed,
  component: SignInRoute,
})

const signUpRoute = createRoute({
  getParentRoute: () => authFrameRoute,
  path: '/sign-up',
  head: ({ match }) => titled(match.context, 'Create an account'),
  beforeLoad: leaveIfSignedInOrUnclaimed,
  component: SignUpRoute,
})

const forgotPasswordRoute = createRoute({
  getParentRoute: () => authFrameRoute,
  path: '/forgot-password',
  head: ({ match }) => titled(match.context, 'Reset your password'),
  beforeLoad: leaveIfSignedInOrUnclaimed,
  component: ForgotPasswordRoute,
})

const resetPasswordRoute = createRoute({
  getParentRoute: () => authFrameRoute,
  path: RESET_PASSWORD_PATH,
  head: ({ match }) => titled(match.context, 'Choose a new password'),
  component: ResetPasswordRoute,
})

const inviteRoute = createRoute({
  getParentRoute: () => authFrameRoute,
  path: '/invite',
  head: ({ match }) => titled(match.context, 'Invitation'),
  component: InviteRoute,
})

const linkRoute = createRoute({
  getParentRoute: () => authFrameRoute,
  path: '/l',
  head: ({ match }) => titled(match.context, 'Shared scene'),
  component: LinkRoute,
})

const sharedSceneRoute = createRoute({
  getParentRoute: () => externalRoute,
  path: '/share/$linkId',
  loader: ({ params }) => loadSharedScene(params.linkId),
  head: ({ match, loaderData }) => titled(match.context, loaderData?.title ?? 'Shared scene'),
  component: lazyRouteComponent(() => import('@/routes/external/shared/shared-scene.tsx'), 'SharedSceneRoute'),
  errorComponent: SharedUnavailable,
})

const embedRoute = createRoute({
  getParentRoute: () => externalRoute,
  path: '/embed',
  validateSearch: (search: Record<string, unknown>): { theme: 'light' | 'dark' } => ({
    theme: search.theme === 'dark' ? 'dark' : 'light',
  }),
  component: lazyRouteComponent(() => import('@/routes/external/embed/embed.tsx'), 'EmbedRoute'),
})

const legacyRoutes = ['/w/$', '/o/$', '/s/$', '/g/$', '/onboarding', '/workspace/$'].map((path) =>
  createRoute({ getParentRoute: () => externalRoute, path, beforeLoad: moveOldAddress }),
)

const internalRoute = createRoute({
  getParentRoute: () => rootRoute,
  id: 'internal',
  beforeLoad: async ({ location }) => {
    const principal = await loadSession()
    if (!principal) throw redirect({ to: '/sign-in', search: { redirect: location.href } })
    return { principal }
  },
  component: Outlet,
})

const homeRoute = createRoute({
  getParentRoute: () => internalRoute,
  path: '/home',
  beforeLoad: ({ context }) => goHome(context.principal),
})

const createFrameRoute = createRoute({
  getParentRoute: () => internalRoute,
  id: 'create',
  component: AuthFrame,
})

const createWorkspaceRoute = createRoute({
  getParentRoute: () => createFrameRoute,
  path: CREATE_WORKSPACE_PATH,
  head: ({ match }) => titled(match.context, 'New workspace'),
  loader: () => preload(queryClient.ensureQueryData(trpc.workspaces.list.queryOptions())),
  component: OnboardingRoute,
})

async function loadWorkspaceContext({ params }: { params: { slug: string } }) {
  const workspace = await loadWorkspace(params.slug)
  if (!workspace) throw notFound()
  await preloadWorkspaceData(workspace)
  return { workspace }
}

async function loadAccountContext({ context }: { context: { principal: Principal } }) {
  const workspace = homeWorkspace(await loadWorkspaces(), lastWorkspaceId(context.principal.userId))
  if (!workspace) throw redirect({ href: CREATE_WORKSPACE_PATH })
  await preloadWorkspaceData(workspace)
  return { workspace }
}

async function preloadWorkspaceData(workspace: WorkspaceSummary): Promise<void> {
  await preload(
    queryClient.ensureQueryData(trpc.workspaces.list.queryOptions()),
    queryClient.ensureQueryData(trpc.collections.list.queryOptions({ workspaceId: workspace.id })),
  )
}

function preloadTeams(workspaceId: string): Promise<void> {
  return preload(queryClient.ensureQueryData(trpc.teams.list.queryOptions({ workspaceId })))
}

function settingsTitle(id: SettingsPageId): string {
  const page = settingsPage(id)
  return page.group === 'account' ? page.label : `${page.label} · Settings`
}

function titled(context: { productName: string }, page?: string) {
  return { meta: [{ title: pageTitle(context.productName, page) }] }
}

const workspaceRoute = createRoute({
  getParentRoute: () => internalRoute,
  path: '/$slug',
  beforeLoad: loadWorkspaceContext,
  component: WorkspaceRoute,
})

const workspaceHomeRoute = createRoute({
  getParentRoute: () => workspaceRoute,
  path: '/',
  loader: ({ context }) => preload(queryClient.ensureQueryData(trpc.scenes.list.queryOptions({ workspaceId: context.workspace.id }))),
  head: ({ match }) => titled(match.context, 'Home'),
  component: HomeRoute,
})

const activityRoute = createRoute({
  getParentRoute: () => workspaceRoute,
  path: '/activity',
  validateSearch: validateActivitySearch,
  loader: ({ context }) => preload(queryClient.ensureQueryData(trpc.scenes.list.queryOptions({ workspaceId: context.workspace.id }))),
  head: ({ match }) => titled(match.context, 'Activity'),
  component: ActivityRoute,
})

const draftsRoute = createRoute({
  getParentRoute: () => workspaceRoute,
  path: '/drafts',
  loader: ({ context }) => preload(queryClient.ensureQueryData(trpc.scenes.list.queryOptions({ workspaceId: context.workspace.id, in: DRAFTS }))),
  head: ({ match }) => titled(match.context, 'Drafts'),
  component: DraftsRoute,
})

const collectionRoute = createRoute({
  getParentRoute: () => workspaceRoute,
  path: '/collections/$collectionId',
  beforeLoad: ({ params }) => {
    if (params.collectionId === DRAFTS) throw redirect({ ...placeLink(params.slug, DRAFTS), replace: true })
  },
  loader: async ({ context, params }) => {
    const workspaceId = context.workspace.id
    const isAdmin = canManageWorkspace(context.workspace.role)
    const [collection] = await Promise.all([
      loadCollection(workspaceId, params.collectionId),
      preload(queryClient.ensureQueryData(trpc.scenes.list.queryOptions({ workspaceId, in: params.collectionId }))),
      isAdmin ? preloadTeams(workspaceId) : undefined,
    ])
    if (!isAdmin && (collection?.teamIds.length ?? 0) > 0) await preloadTeams(workspaceId)
    return collection
  },
  head: ({ match, loaderData }) => titled(match.context, loaderData ? `${loaderData.name} collection` : 'Collection'),
  component: CollectionScenesRoute,
})

const sceneRoute = createRoute({
  getParentRoute: () => workspaceRoute,
  path: '/scenes/$sceneId',
  loader: async ({ context: { workspace }, params }) => {
    const [scene] = await Promise.all([
      loadScene(workspace.id, params.sceneId),
      canEditScenes(workspace.role) ? preload(queryClient.ensureQueryData(trpc.ai.options.queryOptions({ workspaceId: workspace.id }))) : undefined,
    ])
    if (!scene) throw notFound()
    const collection = queryClient.getQueryData(trpc.collections.list.queryKey({ workspaceId: workspace.id }))?.find(({ id }) => id === scene.collectionId)
    if ((collection?.teamIds.length ?? 0) > 0) await preloadTeams(workspace.id)
    return scene
  },
  head: ({ match, loaderData }) => titled(match.context, loaderData?.title),
  component: lazyRouteComponent(() => import('@/routes/internal/scene/scene.tsx'), 'SceneRoute'),
  errorComponent: SceneUnavailable,
  notFoundComponent: SceneNotFound,
})

const settingsRoute = createRoute({
  getParentRoute: () => workspaceRoute,
  path: '/settings',
  component: SettingsRoute,
})

const workspaceSettingsRoute = createRoute({
  getParentRoute: () => settingsRoute,
  path: '/',
  head: ({ match }) => titled(match.context, settingsTitle('general')),
  component: WorkspaceSettingsRoute,
})

const membersRoute = createRoute({
  getParentRoute: () => settingsRoute,
  path: '/members',
  head: ({ match }) => titled(match.context, settingsTitle('members')),
  loader: ({ context: { workspace } }) =>
    preload(
      queryClient.ensureQueryData(trpc.workspaces.members.queryOptions({ workspaceId: workspace.id })),
      ...(canManageWorkspace(workspace.role)
        ? [
            queryClient.ensureQueryData(trpc.workspaces.invites.queryOptions({ workspaceId: workspace.id })),
            queryClient.ensureQueryData(trpc.workspaces.removed.queryOptions({ workspaceId: workspace.id })),
            queryClient.ensureQueryData(trpc.apiKeys.list.queryOptions({ workspaceId: workspace.id })),
          ]
        : []),
    ),
  component: MembersRoute,
})

const aiSettingsRoute = createRoute({
  getParentRoute: () => settingsRoute,
  path: '/ai',
  head: ({ match }) => titled(match.context, settingsTitle('ai')),
  loader: ({ context }) => preload(queryClient.ensureQueryData(trpc.ai.workspaceKey.queryOptions({ workspaceId: context.workspace.id }))),
  component: AiSettingsRoute,
})

const apiKeysRoute = createRoute({
  getParentRoute: () => settingsRoute,
  path: '/api-keys',
  head: ({ match }) => titled(match.context, settingsTitle('api-keys')),
  loader: ({ context: { workspace } }) =>
    canManageWorkspace(workspace.role)
      ? preload(queryClient.ensureQueryData(trpc.apiKeys.list.queryOptions({ workspaceId: workspace.id })))
      : undefined,
  component: ApiKeysRoute,
})

const createApiKeyRoute = createRoute({
  getParentRoute: () => settingsRoute,
  path: '/api-keys/new',
  head: ({ match }) => titled(match.context, 'New API key · Settings'),
  component: CreateApiKeyRoute,
})

const auditLogRoute = createRoute({
  getParentRoute: () => settingsRoute,
  path: '/audit-log',
  head: ({ match }) => titled(match.context, settingsTitle('audit-log')),
  loader: ({ context: { workspace } }) =>
    canManageWorkspace(workspace.role)
      ? preload(
          queryClient.ensureInfiniteQueryData(auditLogQuery(workspace.id)),
          queryClient.ensureQueryData(trpc.workspaces.members.queryOptions({ workspaceId: workspace.id })),
          queryClient.ensureQueryData(trpc.apiKeys.list.queryOptions({ workspaceId: workspace.id })),
        )
      : undefined,
  component: AuditRoute,
})

const teamsRoute = createRoute({
  getParentRoute: () => settingsRoute,
  path: '/teams',
  head: ({ match }) => titled(match.context, settingsTitle('teams')),
  loader: ({ context }) =>
    preload(
      queryClient.ensureQueryData(trpc.teams.list.queryOptions({ workspaceId: context.workspace.id })),
      queryClient.ensureQueryData(trpc.workspaces.members.queryOptions({ workspaceId: context.workspace.id })),
    ),
  component: TeamsRoute,
})

const accountRoute = createRoute({
  getParentRoute: () => internalRoute,
  path: ACCOUNT_PATH,
  beforeLoad: loadAccountContext,
  component: WorkspaceRoute,
})

const accountSettingsRoute = createRoute({
  getParentRoute: () => accountRoute,
  id: 'account-settings',
  component: SettingsRoute,
})

const preferencesRoute = createRoute({
  getParentRoute: () => accountSettingsRoute,
  path: '/',
  head: ({ match }) => titled(match.context, settingsTitle('account')),
  component: PreferencesRoute,
})

const myWorkspacesRoute = createRoute({
  getParentRoute: () => accountSettingsRoute,
  path: '/workspaces',
  head: ({ match }) => titled(match.context, settingsTitle('account-workspaces')),
  component: MyWorkspacesRoute,
})

const routeTree = rootRoute.addChildren([
  externalRoute.addChildren([
    authFrameRoute.addChildren([
      landingRoute,
      setupRoute,
      signInRoute,
      signUpRoute,
      forgotPasswordRoute,
      resetPasswordRoute,
      inviteRoute,
      linkRoute,
    ]),
    sharedSceneRoute,
    embedRoute,
    ...legacyRoutes,
  ]),
  internalRoute.addChildren([
    homeRoute,
    createFrameRoute.addChildren([createWorkspaceRoute]),
    accountRoute.addChildren([accountSettingsRoute.addChildren([preferencesRoute, myWorkspacesRoute])]),
    workspaceRoute.addChildren([
      workspaceHomeRoute,
      activityRoute,
      draftsRoute,
      collectionRoute,
      sceneRoute,
      settingsRoute.addChildren([
        workspaceSettingsRoute,
        membersRoute,
        teamsRoute,
        aiSettingsRoute,
        apiKeysRoute,
        createApiKeyRoute,
        auditLogRoute,
      ]),
    ]),
  ]),
])

export function createAppRouter(history?: RouterHistory) {
  return createRouter({ routeTree, history, defaultPreload: 'intent', defaultPreloadStaleTime: 0 })
}

export const router = createAppRouter()

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router
  }
}
