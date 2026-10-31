import { useNavigate, useRouter } from '@tanstack/react-router'
import { LogOutIcon, MonitorIcon, MoonIcon, SunIcon } from 'lucide-react'
import { useState } from 'react'
import { PhotoButtons } from '@/components/settings/photo-buttons'
import { SettingsCard, SettingsHeading, SettingsNote, SettingsRow, SettingsStack } from '@/components/settings/settings-section'
import { Avatar } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { settingsPage } from '@/helpers/settings-pages'
import { setThemePreference, type ThemePreference, useTheme } from '@/hooks/use-theme'
import { useWorkspace } from '@/hooks/use-workspace'
import { avatarImage, removeAvatar, uploadAvatar } from '@/services/avatars/avatars'
import { signOut } from '@/services/auth/session'
import type { Principal } from '@/types/api'
import type { SubmitResult } from '@/types/forms'

const PAGE = settingsPage('account')

const THEMES = [
  { value: 'light', label: 'Light', icon: SunIcon },
  { value: 'dark', label: 'Dark', icon: MoonIcon },
  { value: 'system', label: 'Match system', icon: MonitorIcon },
] as const

export function PreferencesRoute() {
  const navigate = useNavigate()
  const router = useRouter()
  const { principal } = useWorkspace()
  const { preference } = useTheme()

  const refreshing = async (result: SubmitResult) => {
    if (!result.error) await router.invalidate()
    return result
  }

  return (
    <PreferencesPage
      principal={principal}
      theme={preference}
      onTheme={setThemePreference}
      onUploadPhoto={async (file) => refreshing(await uploadAvatar(file))}
      onRemovePhoto={async () => refreshing(await removeAvatar())}
      onSignOut={async () => {
        const result = await signOut()
        if (!result.error) await navigate({ to: '/sign-in' })
        return result
      }}
    />
  )
}

export function PreferencesPage({
  principal,
  theme,
  onTheme,
  onUploadPhoto,
  onRemovePhoto,
  onSignOut,
}: {
  principal: Principal
  theme: ThemePreference
  onTheme: (theme: ThemePreference) => void
  onUploadPhoto: (file: File) => Promise<SubmitResult>
  onRemovePhoto: () => Promise<SubmitResult>
  onSignOut: () => Promise<SubmitResult>
}) {
  const [signingOut, setSigningOut] = useState(false)
  const [error, setError] = useState<string>()
  const [photoError, setPhotoError] = useState<string>()
  const photo = avatarImage(principal.avatarId)

  return (
    <>
      <SettingsHeading title={PAGE.label} description={PAGE.description} />
      <SettingsStack>
        <div>
          <SettingsCard title="Profile">
            <div className="flex flex-wrap items-center gap-3 px-5 py-4">
              <Avatar name={principal.name} seed={principal.userId} image={photo} size="lg" />
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium text-foreground">{principal.name}</p>
                <p className="truncate text-sm text-muted-foreground">{principal.email}</p>
              </div>
              <PhotoButtons hasPhoto={photo !== undefined} onUpload={onUploadPhoto} onRemove={onRemovePhoto} onResult={setPhotoError} />
            </div>
            {photoError && (
              <p role="alert" className="border-t px-5 py-3 text-sm text-destructive">
                {photoError}
              </p>
            )}
          </SettingsCard>
          <SettingsNote>Your photo is shown to people in your workspaces. Your name and email come from your account and can’t be changed here yet.</SettingsNote>
        </div>
        <SettingsCard title="Appearance" description="Applies to the app on this browser. Scenes follow it too.">
          <fieldset className="px-5 py-4">
            <legend className="sr-only">Theme</legend>
            <div className="grid grid-cols-3 gap-2">
              {THEMES.map(({ value, label, icon: Icon }) => (
                <label
                  key={value}
                  className="flex cursor-pointer flex-col items-center gap-2 rounded-lg text-center border px-2 py-3 text-sm text-muted-foreground transition-colors duration-150 hover:bg-accent/60 hover:text-foreground has-checked:border-foreground/30 has-checked:bg-accent has-checked:font-medium has-checked:text-foreground has-focus-visible:ring-3 has-focus-visible:ring-ring motion-reduce:transition-none"
                >
                  <input
                    type="radio"
                    name="theme"
                    value={value}
                    checked={theme === value}
                    onChange={() => onTheme(value)}
                    className="sr-only"
                  />
                  <Icon aria-hidden className="size-5" />
                  {label}
                </label>
              ))}
            </div>
          </fieldset>
        </SettingsCard>
        <SettingsCard title="Session">
          <SettingsRow label="Sign out" description="Ends your session on this browser. Your other devices stay signed in.">
            <Button
              variant="outline"
              disabled={signingOut}
              onClick={async () => {
                setSigningOut(true)
                const result = await onSignOut()
                setSigningOut(false)
                setError(result.error)
              }}
            >
              <LogOutIcon aria-hidden />
              {signingOut ? 'Signing out…' : 'Sign out'}
            </Button>
          </SettingsRow>
          {error && (
            <p role="alert" className="px-5 py-3 text-sm text-destructive">
              {error}
            </p>
          )}
        </SettingsCard>
      </SettingsStack>
    </>
  )
}
