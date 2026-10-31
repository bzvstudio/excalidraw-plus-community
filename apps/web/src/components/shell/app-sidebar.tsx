import type { WorkspaceSummary } from '@repo/api'
import { ActivityIcon } from '@animateicons/react/lucide/activity-icon'
import { FileTextIcon } from '@animateicons/react/lucide/file-text-icon'
import { HouseIcon } from '@animateicons/react/lucide/house-icon'
import { PlusIcon } from '@animateicons/react/lucide/plus-icon'
import { SearchIcon } from '@animateicons/react/lucide/search-icon'
import { SettingsIcon } from '@animateicons/react/lucide/settings-icon'
import { AnimatedIcon } from '@/components/ui/animated-icon'
import { Link } from '@tanstack/react-router'
import type { ReactNode } from 'react'
import { Button } from '@/components/ui/button'
import { Kbd } from '@/components/ui/kbd'
import { activityLink, placeLink, settingsLink, workspaceLink } from '@/helpers/places'
import type { ThemePreference } from '@/hooks/use-theme'
import { DRAFTS } from '@repo/api/scenes.const'
import { type CollectionActions, CollectionsNav } from './collections-nav'
import { SIDEBAR_ROW } from './sidebar-styles'
import { UserMenu } from './user-menu'
import { WorkspaceSwitcher } from './workspace-switcher'
import { ariaChord, chord } from '@/helpers/platform'
import type { Principal } from '@/types/api'

export function AppSidebar({
  principal,
  workspace,
  workspaces,
  themePreference,
  children,
  onSearch,
  onNewScene,
  onThemeChange,
  onSwitchWorkspace,
  onCreateWorkspace,
  onOpenAccount,
  onSignOut,
}: {
  principal: Principal
  workspace: WorkspaceSummary
  workspaces: WorkspaceSummary[]
  themePreference: ThemePreference
  children: ReactNode
  onSearch: () => void
  onNewScene?: () => void
  onThemeChange: (preference: ThemePreference) => void
  onSwitchWorkspace: (slug: string) => void
  onCreateWorkspace: () => void
  onOpenAccount: () => void
  onSignOut: () => void
}) {
  return (
    <div className="flex h-full min-h-0 flex-col gap-3 px-2 pt-2 pb-2 text-sidebar-foreground">
      <WorkspaceSwitcher
        workspace={workspace}
        workspaces={workspaces}
        onSwitch={onSwitchWorkspace}
        onCreate={onCreateWorkspace}
      />
      <div className="flex flex-col gap-1.5">
        <button
          type="button"
          onClick={onSearch}
          aria-keyshortcuts={ariaChord('K')}
          className="flex h-8 w-full items-center gap-2 rounded-lg border border-input bg-background px-2 text-sm text-muted-foreground transition-colors duration-150 outline-none hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring motion-reduce:transition-none"
        >
          <AnimatedIcon icon={SearchIcon} />
          <span className="flex-1 text-left">Search</span>
          <Kbd className="[@media(pointer:coarse)]:hidden">{chord('K')}</Kbd>
        </button>
        {onNewScene && (
          <Button size="sm" onClick={onNewScene} className="w-full">
            <AnimatedIcon icon={PlusIcon} />
            New scene
          </Button>
        )}
      </div>
      <div className="flex min-h-0 flex-1 flex-col gap-4">{children}</div>
      <UserMenu
        principal={principal}
        themePreference={themePreference}
        onThemeChange={onThemeChange}
        onOpenAccount={onOpenAccount}
        onSignOut={onSignOut}
      />
    </div>
  )
}

export function WorkspaceNav({
  workspaceSlug,
  collections,
  collectionActions,
  collectionsOpen,
  onCollectionsOpenChange,
}: {
  workspaceSlug: string
  collections: Parameters<typeof CollectionsNav>[0]['collections']
  collectionActions?: CollectionActions
  collectionsOpen: boolean
  onCollectionsOpenChange: (open: boolean) => void
}) {
  return (
    <>
      <nav aria-label="Workspace pages" className="flex flex-col gap-px">
        <Link {...workspaceLink(workspaceSlug)} activeOptions={{ exact: true }} className={SIDEBAR_ROW}>
          <AnimatedIcon icon={HouseIcon} />
          Home
        </Link>
        <Link {...placeLink(workspaceSlug, DRAFTS)} className={SIDEBAR_ROW}>
          <AnimatedIcon icon={FileTextIcon} />
          Drafts
        </Link>
        <Link {...activityLink(workspaceSlug)} className={SIDEBAR_ROW}>
          <AnimatedIcon icon={ActivityIcon} />
          Activity
        </Link>
        <Link {...settingsLink(workspaceSlug)} className={SIDEBAR_ROW}>
          <AnimatedIcon icon={SettingsIcon} />
          Settings
        </Link>
      </nav>
      <CollectionsNav
        workspaceSlug={workspaceSlug}
        collections={collections}
        actions={collectionActions}
        open={collectionsOpen}
        onOpenChange={onCollectionsOpenChange}
      />
    </>
  )
}
