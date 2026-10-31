import { LogOutIcon } from '@animateicons/react/lucide/log-out-icon'
import { MonitorIcon } from '@animateicons/react/lucide/monitor-icon'
import { MoonIcon } from '@animateicons/react/lucide/moon-icon'
import { SunIcon } from '@animateicons/react/lucide/sun-icon'
import { UserRoundIcon } from '@animateicons/react/lucide/user-round-icon'
import { AnimatedIcon } from '@/components/ui/animated-icon'
import { ChevronsUpDownIcon } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Avatar } from '@/components/ui/avatar'
import type { ThemePreference } from '@/hooks/use-theme'
import { avatarImage } from '@/services/avatars/avatars'
import type { Principal } from '@/types/api'
import { SIDEBAR_MENU_TRIGGER } from './sidebar-styles'

const THEMES = [
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
  { value: 'system', label: 'Match system' },
] as const

const THEME_ICONS = { light: SunIcon, dark: MoonIcon, system: MonitorIcon }

export function UserMenu({
  principal,
  themePreference,
  onThemeChange,
  onOpenAccount,
  onSignOut,
}: {
  principal: Principal
  themePreference: ThemePreference
  onThemeChange: (preference: ThemePreference) => void
  onOpenAccount: () => void
  onSignOut: () => void
}) {
  const ThemeIcon = THEME_ICONS[themePreference]

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label={`${principal.name}, account menu`}
        className={SIDEBAR_MENU_TRIGGER}
      >
        <Avatar name={principal.name} seed={principal.userId} image={avatarImage(principal.avatarId)} size="sm" />
        <span className="min-w-0 flex-1 truncate text-sm font-medium text-foreground">{principal.name}</span>
        <ChevronsUpDownIcon aria-hidden className="size-4 shrink-0 text-muted-foreground" />
      </DropdownMenuTrigger>
      <DropdownMenuContent side="top" align="start" sideOffset={4} className="w-60">
        <div className="flex min-w-0 flex-col px-2 py-1.5">
          <span className="truncate text-sm font-medium text-foreground">{principal.name}</span>
          <span className="truncate text-xs text-muted-foreground">{principal.email}</span>
        </div>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={onOpenAccount}>
          <AnimatedIcon icon={UserRoundIcon} />
          Account
        </DropdownMenuItem>
        <DropdownMenuSub>
          <DropdownMenuSubTrigger>
            <AnimatedIcon icon={ThemeIcon} />
            Theme
          </DropdownMenuSubTrigger>
          <DropdownMenuSubContent>
            <DropdownMenuRadioGroup value={themePreference} onValueChange={(value) => onThemeChange(value as ThemePreference)}>
              {THEMES.map(({ value, label }) => (
                <DropdownMenuRadioItem key={value} value={value}>
                  {label}
                </DropdownMenuRadioItem>
              ))}
            </DropdownMenuRadioGroup>
          </DropdownMenuSubContent>
        </DropdownMenuSub>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={onSignOut}>
          <AnimatedIcon icon={LogOutIcon} />
          Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
