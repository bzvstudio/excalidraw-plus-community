import { GlobeIcon, UsersIcon } from 'lucide-react'
import { type ReactNode, useId, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { countLabel } from '@/helpers/home'
import { cn } from '@/lib/utils'
import type { Collection, Team } from '@/types/api'
import type { SubmitResult } from '@/types/forms'

type Audience = 'everyone' | 'teams'

function AudienceOption({
  value,
  audience,
  icon: Icon,
  title,
  description,
  disabled = false,
  onChange,
  children,
}: {
  value: Audience
  audience: Audience
  icon: typeof GlobeIcon
  title: string
  description: string
  disabled?: boolean
  onChange: (audience: Audience) => void
  children?: ReactNode
}) {
  const id = useId()
  return (
    <div
      className={cn(
        'rounded-lg border transition-colors duration-150 has-checked:border-foreground/30 has-checked:bg-accent/50 has-focus-visible:ring-3 has-focus-visible:ring-ring motion-reduce:transition-none',
        disabled && 'opacity-60',
      )}
    >
      <label className={cn('flex items-start gap-3 px-3 py-2.5', disabled ? 'cursor-not-allowed' : 'cursor-pointer')}>
        <input
          type="radio"
          name="audience"
          value={value}
          checked={audience === value}
          disabled={disabled}
          onChange={() => onChange(value)}
          aria-labelledby={`${id}-title`}
          aria-describedby={`${id}-description`}
          className="mt-0.5 size-4 shrink-0 accent-foreground outline-none"
        />
        <span className="flex min-w-0 flex-1 flex-col gap-0.5">
          <span id={`${id}-title`} className="flex items-center gap-1.5 text-sm font-medium text-foreground">
            <Icon aria-hidden className="size-3.5 text-muted-foreground" />
            {title}
          </span>
          <span id={`${id}-description`} className="text-xs text-pretty text-muted-foreground">
            {description}
          </span>
        </span>
      </label>
      {children}
    </div>
  )
}

export function AccessDialog({
  collection,
  teams,
  onClose,
  onSave,
}: {
  collection: Collection
  teams: Team[]
  onClose: () => void
  onSave: (teamIds: string[]) => Promise<SubmitResult>
}) {
  const [audience, setAudience] = useState<Audience>(collection.teamIds.length > 0 ? 'teams' : 'everyone')
  const [chosen, setChosen] = useState(new Set(collection.teamIds))
  const [error, setError] = useState<string>()
  const [saving, setSaving] = useState(false)

  const toggle = (teamId: string) => {
    setError(undefined)
    setChosen((current) => {
      const next = new Set(current)
      if (!next.delete(teamId)) next.add(teamId)
      return next
    })
  }

  const submit = async (event: React.FormEvent) => {
    event.preventDefault()
    const teamIds = audience === 'everyone' ? [] : [...chosen]
    if (audience === 'teams' && teamIds.length === 0) return setError('Choose at least one team, or open it to everyone.')
    setSaving(true)
    const result = await onSave(teamIds)
    setSaving(false)
    if (result.error) setError(result.error)
    else onClose()
  }

  return (
    <Dialog open onOpenChange={(open) => !open && !saving && onClose()}>
      <DialogContent className="sm:max-w-md">
        <form onSubmit={submit} noValidate className="flex flex-col gap-5">
          <DialogHeader>
            <DialogTitle>Who can see “{collection.name}”</DialogTitle>
            <DialogDescription>Admins always see every collection. Scenes in it follow what you choose here.</DialogDescription>
          </DialogHeader>
          <fieldset className="flex flex-col gap-2">
            <legend className="sr-only">Who can see it</legend>
            <AudienceOption
              value="everyone"
              audience={audience}
              icon={GlobeIcon}
              title="Everyone in the workspace"
              description="Every member and viewer can open it."
              onChange={setAudience}
            />
            <AudienceOption
              value="teams"
              audience={audience}
              icon={UsersIcon}
              title="Only some teams"
              description={teams.length === 0 ? 'There are no teams yet. Create them under Settings › Teams.' : 'Only people in the teams you pick.'}
              disabled={teams.length === 0}
              onChange={setAudience}
            >
              {audience === 'teams' && teams.length > 0 && (
                <fieldset className="flex flex-col gap-0.5 border-t px-3 py-2">
                  <legend className="sr-only">Teams</legend>
                  {teams.map((team) => (
                    <label key={team.id} className="flex cursor-pointer items-center gap-2.5 rounded-md py-1.5 pl-7 text-sm">
                      <Checkbox checked={chosen.has(team.id)} onChange={() => toggle(team.id)} />
                      <span className="flex-1 truncate text-foreground">{team.name}</span>
                      <span className="text-xs text-muted-foreground tabular-nums">{countLabel(team.memberIds.length, 'person', 'people')}</span>
                    </label>
                  ))}
                </fieldset>
              )}
            </AudienceOption>
          </fieldset>
          {error && (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          )}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} disabled={saving}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? 'Saving…' : 'Save'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
