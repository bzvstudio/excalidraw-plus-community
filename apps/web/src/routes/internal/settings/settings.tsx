import { Outlet, useRouterState } from '@tanstack/react-router'
import { useLayoutEffect, useRef } from 'react'
import { SettingsMenu } from '@/components/settings/settings-nav'
import { SidebarToggle } from '@/components/shell/sidebar-toggle'
import { PageCrumbs } from '@/components/shell/workspace-page'
import { PageHeader } from '@/components/ui/page-header'
import { fadeIn } from '@/helpers/motion'
import { settingsCrumbs, settingsPlaceAt } from '@/helpers/settings-pages'
import { canManageWorkspace } from '@/helpers/roles'
import { useSidebarCollapsed, useWide } from '@/hooks/use-sidebar'
import { useWorkspace } from '@/hooks/use-workspace'

export function SettingsRoute() {
  const { workspace } = useWorkspace()
  const pathname = useRouterState({ select: (state) => (state.resolvedLocation ?? state.location).pathname })
  const place = settingsPlaceAt(pathname)
  const body = useRef<HTMLDivElement>(null)
  const shown = useRef(pathname)
  const collapsed = useSidebarCollapsed()
  const wide = useWide()
  const sidebarHidden = collapsed || !wide

  useLayoutEffect(() => {
    if (shown.current === pathname) return
    shown.current = pathname
    body.current?.closest('main')?.scrollTo({ top: 0 })
    fadeIn(body.current)
  }, [pathname])

  if (!place) return <Outlet />

  return (
    <>
      <PageHeader>
        <SidebarToggle />
        <PageCrumbs crumbs={settingsCrumbs(place, workspace)} />
      </PageHeader>
      <div className="mx-auto flex w-full max-w-208 flex-1 flex-col px-4 pt-5 pb-12 md:px-8 md:pt-8">
        {sidebarHidden && (
          <SettingsMenu
            workspaceSlug={workspace.slug}
            isAdmin={canManageWorkspace(workspace.role)}
            current={place.page.id}
            className="mb-6"
          />
        )}
        <div ref={body} className="flex w-full min-w-0 flex-col">
          <Outlet />
        </div>
      </div>
    </>
  )
}
