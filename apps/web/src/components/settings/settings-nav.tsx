import { Link } from '@tanstack/react-router'
import { CheckIcon, ChevronsUpDownIcon } from 'lucide-react'
import { useId } from 'react'
import { SIDEBAR_SUB_ROW } from '@/components/shell/sidebar-styles'
import { AnimatedIcon } from '@/components/ui/animated-icon'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { SETTINGS_GROUP_LABELS, type SettingsGroup, type SettingsPageId } from '@/constants/settings'
import { SETTINGS_ICONS } from '@/constants/settings-icons'
import { settingsLink } from '@/helpers/places'
import { settingsPage, settingsPagesFor } from '@/helpers/settings-pages'
import { cn } from '@/lib/utils'

const GROUPS: SettingsGroup[] = ['workspace', 'account']

export function SettingsNav({
  workspaceSlug,
  isAdmin,
  current,
}: {
  workspaceSlug: string
  isAdmin: boolean
  current: SettingsPageId | undefined
}) {
  const baseId = useId()
  const open = current !== undefined
  return (
    <div
      inert={!open}
      className={cn(
        'grid transition-[grid-template-rows,opacity] duration-200 ease-out motion-reduce:transition-none',
        open ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0',
      )}
    >
      <div className="-mr-1 min-h-0 overflow-hidden pr-1">
        <nav aria-label="Settings" className="my-0.5 ml-4 flex flex-col gap-1 border-l border-sidebar-border pl-2">
          {GROUPS.map((group) => (
            <div key={group} role="group" aria-labelledby={`${baseId}-${group}`} className="flex flex-col gap-px">
              <span id={`${baseId}-${group}`} className="flex h-7 items-center px-2 text-xs font-medium text-muted-foreground">
                {SETTINGS_GROUP_LABELS[group]}
              </span>
              {settingsPagesFor(isAdmin, group).map((page) => (
                <Link
                  key={page.id}
                  {...settingsLink(workspaceSlug, page.id)}
                  aria-current={page.id === current ? 'page' : undefined}
                  activeOptions={{ exact: true }}
                  className={SIDEBAR_SUB_ROW}
                >
                  <AnimatedIcon icon={SETTINGS_ICONS[page.id]} />
                  <span className="truncate">{page.label}</span>
                </Link>
              ))}
            </div>
          ))}
        </nav>
      </div>
    </div>
  )
}

export function SettingsMenu({
  workspaceSlug,
  isAdmin,
  current,
  className,
}: {
  workspaceSlug: string
  isAdmin: boolean
  current: SettingsPageId
  className?: string
}) {
  const page = settingsPage(current)
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className={cn(
          'flex h-10 w-full items-center gap-2.5 rounded-lg border border-input bg-background px-3 text-left text-sm font-medium text-foreground transition-colors duration-150 outline-none hover:bg-accent focus-visible:ring-3 focus-visible:ring-ring aria-expanded:bg-accent motion-reduce:transition-none',
          className,
        )}
      >
        <AnimatedIcon icon={SETTINGS_ICONS[current]} className="text-muted-foreground" />
        <span className="flex-1 truncate">
          <span className="text-muted-foreground">{SETTINGS_GROUP_LABELS[page.group]} ·</span> {page.label}
          <span className="sr-only">, change page</span>
        </span>
        <ChevronsUpDownIcon aria-hidden className="size-4 shrink-0 text-muted-foreground" />
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-(--anchor-width)">
        {GROUPS.map((group, index) => (
          <DropdownMenuGroup key={group}>
            {index > 0 && <DropdownMenuSeparator />}
            <DropdownMenuLabel>{SETTINGS_GROUP_LABELS[group]}</DropdownMenuLabel>
            {settingsPagesFor(isAdmin, group).map((option) => (
              <DropdownMenuItem
                key={option.id}
                render={
                  <Link {...settingsLink(workspaceSlug, option.id)} aria-current={option.id === current ? 'page' : undefined} />
                }
              >
                <AnimatedIcon icon={SETTINGS_ICONS[option.id]} />
                <span className="flex-1">{option.label}</span>
                {option.id === current && (
                  <>
                    <CheckIcon aria-hidden />
                    <span className="sr-only">(current page)</span>
                  </>
                )}
              </DropdownMenuItem>
            ))}
          </DropdownMenuGroup>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
