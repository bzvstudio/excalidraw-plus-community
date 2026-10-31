import { Link } from '@tanstack/react-router'
import { CheckIcon, ChevronsUpDownIcon } from 'lucide-react'
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

const ROW =
  'flex h-8 w-full min-w-0 items-center gap-2.5 rounded-md px-2 text-sm text-muted-foreground transition-colors duration-150 outline-none hover:bg-accent hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring aria-[current=page]:bg-accent aria-[current=page]:font-medium aria-[current=page]:text-foreground motion-reduce:transition-none'

export function SettingsNav({
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
  return (
    <nav aria-label="Settings" className={cn('flex flex-col gap-5', className)}>
      {GROUPS.map((group) => (
        <div key={group} role="group" aria-labelledby={`settings-group-${group}`} className="flex flex-col gap-px">
          <span id={`settings-group-${group}`} className="flex h-7 items-center px-2 text-xs font-medium text-muted-foreground">
            {SETTINGS_GROUP_LABELS[group]}
          </span>
          {settingsPagesFor(isAdmin, group).map((page) => {
            const Icon = SETTINGS_ICONS[page.id]
            return (
              <Link
                key={page.id}
                {...settingsLink(workspaceSlug, page.id)}
                aria-current={page.id === current ? 'page' : undefined}
                activeOptions={{ exact: true }}
                className={ROW}
              >
                <Icon aria-hidden className="size-4 shrink-0" />
                <span className="truncate">{page.label}</span>
              </Link>
            )
          })}
        </div>
      ))}
    </nav>
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
  const Icon = SETTINGS_ICONS[current]
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className={cn(
          'flex h-10 w-full items-center gap-2.5 rounded-lg border border-input bg-background px-3 text-left text-sm font-medium text-foreground transition-colors duration-150 outline-none hover:bg-accent focus-visible:ring-3 focus-visible:ring-ring aria-expanded:bg-accent motion-reduce:transition-none',
          className,
        )}
      >
        <Icon aria-hidden className="size-4 shrink-0 text-muted-foreground" />
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
            {settingsPagesFor(isAdmin, group).map((option) => {
              const OptionIcon = SETTINGS_ICONS[option.id]
              return (
                <DropdownMenuItem
                  key={option.id}
                  render={
                    <Link {...settingsLink(workspaceSlug, option.id)} aria-current={option.id === current ? 'page' : undefined} />
                  }
                >
                  <OptionIcon aria-hidden />
                  <span className="flex-1">{option.label}</span>
                  {option.id === current && (
                    <>
                      <CheckIcon aria-hidden />
                      <span className="sr-only">(current page)</span>
                    </>
                  )}
                </DropdownMenuItem>
              )
            })}
          </DropdownMenuGroup>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
