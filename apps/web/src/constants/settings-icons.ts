import { Building2Icon, KeyRoundIcon, ScrollTextIcon, SlidersHorizontalIcon, SparklesIcon, UserRoundIcon, UsersIcon, UsersRoundIcon } from 'lucide-react'
import type { ComponentType } from 'react'
import type { SettingsPageId } from '@/constants/settings'

export const SETTINGS_ICONS: Record<SettingsPageId, ComponentType<{ className?: string; 'aria-hidden'?: boolean }>> = {
  general: SlidersHorizontalIcon,
  members: UsersRoundIcon,
  teams: UsersIcon,
  ai: SparklesIcon,
  'api-keys': KeyRoundIcon,
  'audit-log': ScrollTextIcon,
  account: UserRoundIcon,
  'account-workspaces': Building2Icon,
}
