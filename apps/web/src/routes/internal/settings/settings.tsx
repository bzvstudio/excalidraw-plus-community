import { Outlet, useRouterState } from '@tanstack/react-router'
import { useLayoutEffect, useRef } from 'react'
import { SettingsMenu, SettingsNav } from '@/components/settings/settings-nav'
import { SidebarToggle } from '@/components/shell/sidebar-toggle'
import { PageCrumbs } from '@/components/shell/workspace-page'
import { PageHeader } from '@/components/ui/page-header'
import { fadeIn } from '@/helpers/motion'
import { settingsCrumbs, settingsPlaceAt } from '@/helpers/settings-pages'
import { canManageWorkspace } from '@/helpers/roles'
import { useWorkspace } from '@/hooks/use-workspace'

export function SettingsRoute() {
  const { workspace } = useWorkspace()
  const pathname = useRouterState({ select: (state) => (state.resolvedLocation ?? state.location).pathname })
  const place = settingsPlaceAt(pathname)
  const body = useRef<HTMLDivElement>(null)
  const shown = useRef(pathname)

  useLayoutEffect(() => {
    if (shown.current === pathname) return
    shown.current = pathname
    body.current?.closest('main')?.scrollTo({ top: 0 })
    fadeIn(body.current)
  }, [pathname])

  if (!place) return <Outlet />

  const isAdmin = canManageWorkspace(workspace.role)
  const nav = { workspaceSlug: workspace.slug, isAdmin, current: place.page.id }

  return (
    <>
      <PageHeader>
        <SidebarToggle />
        <PageCrumbs crumbs={settingsCrumbs(place, workspace)} />
      </PageHeader>
      <div className="mx-auto flex w-full max-w-6xl flex-1 gap-8 px-4 pt-5 pb-12 md:px-8 md:pt-8 xl:gap-12">
        <SettingsNav {...nav} className="sticky top-20 w-48 shrink-0 self-start max-lg:hidden" />
        <div className="flex min-w-0 flex-1 flex-col">
          <SettingsMenu {...nav} className="mb-6 lg:hidden" />
          <div ref={body} className="flex w-full max-w-3xl min-w-0 flex-col">
            <Outlet />
          </div>
        </div>
      </div>
    </>
  )
}
