import { Building2Icon } from '@animateicons/react/lucide/building-2-icon'
import { KeyRoundIcon } from '@animateicons/react/lucide/key-round-icon'
import { ScrollTextIcon } from '@animateicons/react/lucide/scroll-text-icon'
import { SlidersHorizontalIcon } from '@animateicons/react/lucide/sliders-horizontal-icon'
import { SparklesIcon } from '@animateicons/react/lucide/sparkles-icon'
import { UserRoundIcon } from '@animateicons/react/lucide/user-round-icon'
import { UsersIcon } from '@animateicons/react/lucide/users-icon'
import { UsersRoundIcon } from '@animateicons/react/lucide/users-round-icon'
import type { AnimatableIcon } from '@/components/ui/animated-icon'
import type { SettingsPageId } from '@/constants/settings'

export const SETTINGS_ICONS: Record<SettingsPageId, AnimatableIcon> = {
  general: SlidersHorizontalIcon,
  members: UsersRoundIcon,
  teams: UsersIcon,
  ai: SparklesIcon,
  'api-keys': KeyRoundIcon,
  'audit-log': ScrollTextIcon,
  account: UserRoundIcon,
  'account-workspaces': Building2Icon,
}
