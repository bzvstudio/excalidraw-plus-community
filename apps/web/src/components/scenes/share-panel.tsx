import { SHARE_LINK_VALIDITY_DAYS } from '@repo/api/sharing.const'
import { GlobeIcon, LinkIcon, LockIcon, UsersIcon } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
import { CopyField } from '@/components/copy-field'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { OptionSelect } from '@/components/workspaces/option-select'
import { timeAgo, timeUntil } from '@/helpers/time'
import type { Visibility } from '@/helpers/visibility'
import type { CreatedLink, ShareRole, ShareValidity } from '@/services/shares/shares'
import type { ShareLinkSummary } from '@/types/api'

const ROLES = [
  { value: 'view', label: 'Can view' },
  { value: 'edit', label: 'Can edit' },
] as const

const VALIDITY_LABELS: Record<(typeof SHARE_LINK_VALIDITY_DAYS)[number], string> = {
  1: 'For a day',
  7: 'For a week',
  30: 'For 30 days',
}

const VALIDITY = [
  ...SHARE_LINK_VALIDITY_DAYS.map((days) => ({ value: String(days), label: VALIDITY_LABELS[days] })),
  { value: 'never', label: 'Until turned off' },
]

const ACCESS_ICONS = { drafts: LockIcon, everyone: GlobeIcon, teams: UsersIcon }

function accessText(visibility: Visibility): { title: string; detail: string } {
  if (visibility.kind === 'drafts') return { title: 'Only you, and admins', detail: 'A draft stays yours until you move it into a collection.' }
  if (visibility.kind === 'everyone') return { title: `Everyone in ${visibility.workspaceName}`, detail: 'Its collection is open to the whole workspace.' }
  const names = visibility.teamNames
  const who = names.length === 0 ? 'Members of its teams' : names.length === 1 ? `Members of ${names[0]}` : `Members of ${names.slice(0, -1).join(', ')} and ${names.at(-1)}`
  return { title: `${who}, and admins`, detail: 'Its collection is kept to some teams.' }
}

export function ShareAccess({ visibility, sceneUrl }: { visibility?: Visibility; sceneUrl: string }) {
  const Icon = visibility ? ACCESS_ICONS[visibility.kind] : UsersIcon
  const text = visibility ? accessText(visibility) : { title: 'People in this workspace who can see it', detail: 'Who that is depends on its collection.' }
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(sceneUrl)
      toast('Link copied — it opens for people who can see this scene')
    } catch {
      toast.error('Could not copy. Copy the address from the browser instead.')
    }
  }

  return (
    <section aria-labelledby="share-access" className="flex flex-col gap-2">
      <h3 id="share-access" className="text-xs font-medium text-muted-foreground">
        Who can open it in the workspace
      </h3>
      <div className="flex flex-wrap items-center gap-3 rounded-xl border p-3">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
          <Icon aria-hidden className="size-4" />
        </span>
        <span className="flex min-w-0 flex-1 basis-48 flex-col">
          <span className="truncate text-sm font-medium">{text.title}</span>
          <span className="text-xs text-pretty text-muted-foreground">{text.detail}</span>
        </span>
        <Button variant="outline" size="sm" className="max-sm:w-full" onClick={copy}>
          <LinkIcon aria-hidden />
          Copy link
        </Button>
      </div>
    </section>
  )
}

export function SharePanel({
  links,
  guestEditLinks,
  error,
  onCreate,
  onRevoke,
}: {
  links: ShareLinkSummary[] | undefined
  guestEditLinks: boolean
  error?: string
  onCreate: (role: ShareRole, validForDays: ShareValidity) => Promise<CreatedLink | undefined>
  onRevoke: (link: ShareLinkSummary) => void
}) {
  const [role, setRole] = useState<ShareRole>('view')
  const [validity, setValidity] = useState('7')
  const [created, setCreated] = useState<CreatedLink>()
  const [busy, setBusy] = useState(false)

  const create = async () => {
    setBusy(true)
    setCreated(await onCreate(role, validity === 'never' ? null : (Number(validity) as ShareValidity)))
    setBusy(false)
  }

  return (
    <div className="flex flex-col gap-6">
      <section aria-labelledby="share-guests" className="flex flex-col gap-3">
        <div className="flex flex-col gap-0.5">
          <h3 id="share-guests" className="text-xs font-medium text-muted-foreground">
            Guest links
          </h3>
          <p className="text-sm text-pretty text-muted-foreground">
            Anyone with a guest link can open this scene without an account, until the link expires or you turn it off.
          </p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <OptionSelect label="What people with the link can do" value={role} options={ROLES} onChange={setRole} className="w-full sm:w-32" />
          <OptionSelect label="How long the link works" value={validity} options={VALIDITY} onChange={setValidity} className="w-full sm:flex-1" />
          <Button size="sm" onClick={create} disabled={busy}>
            Create link
          </Button>
        </div>
        {role === 'edit' && !guestEditLinks && (
          <p className="rounded-lg bg-warning px-3 py-2 text-xs text-warning-foreground">
            This workspace lets guests only view, so this link will open read-only. An admin can change that in settings.
          </p>
        )}
        {created && (
          <div className="flex flex-col gap-3 rounded-xl border bg-muted/40 p-3 duration-200 animate-in fade-in-0 slide-in-from-top-1 motion-reduce:animate-none">
            <div className="flex flex-col gap-1.5">
              <span className="text-xs font-medium">New link</span>
              <CopyField label="Share link" value={created.url} />
            </div>
            {created.embed && (
              <div className="flex flex-col gap-1.5">
                <span className="text-xs font-medium">Embed code</span>
                <CopyField label="Embed in another site" value={created.embed} />
              </div>
            )}
            <p className="text-xs text-muted-foreground">Copy it now — it is not shown again.</p>
          </div>
        )}
        {error && (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        )}
      </section>
      <section aria-labelledby="share-live" className="flex flex-col gap-2">
        <h3 id="share-live" className="text-xs font-medium text-muted-foreground">
          Links that work now
        </h3>
        {links?.length === 0 && (
          <p className="rounded-xl border border-dashed px-3 py-4 text-center text-sm text-muted-foreground">
            No guest links. Links you turned off no longer open the scene.
          </p>
        )}
        {links && links.length > 0 && (
          <ul className="flex flex-col divide-y rounded-xl border">
            {links.map((link) => (
              <li key={link.id} className="flex items-center gap-3 py-2 pr-2 pl-3 text-sm">
                <Badge variant={link.role === 'edit' ? 'brand' : 'secondary'}>{link.role === 'edit' ? 'Can edit' : 'Can view'}</Badge>
                <span className="min-w-0 flex-1 text-xs text-pretty text-muted-foreground">
                  Made {timeAgo(new Date(link.createdAt))}
                  {link.expiresAt ? ` · ends ${timeUntil(new Date(link.expiresAt))}` : ' · no end date'}
                </span>
                <Button variant="ghost" size="sm" onClick={() => onRevoke(link)}>
                  Turn off
                </Button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}

