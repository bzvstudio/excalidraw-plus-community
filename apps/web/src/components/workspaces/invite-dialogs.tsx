import type { InvitableRole } from '@repo/api'
import { INVITABLE_ROLES } from '@repo/api/authorization.const'
import { INVITE_DEFAULT_DAYS } from '@repo/api/workspaces.const'
import { CheckCircle2Icon } from 'lucide-react'
import { type FormEvent, type ReactNode, useState } from 'react'
import { CopyField } from '@/components/copy-field'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { INVITE_MAX_USES_OPTIONS, maxUsesSentence } from '@/constants/roles'
import type { SubmitResult } from '@/types/forms'
import { OptionSelect } from './option-select'
import { RoleChoice } from './role-choice'

export type InviteMaxUses = 1 | 2 | 5 | 10 | 25 | 50 | null

function InviteDialog({
  title,
  description,
  busy,
  onClose,
  children,
}: {
  title: string
  description: string
  busy: boolean
  onClose: () => void
  children: ReactNode
}) {
  return (
    <Dialog open onOpenChange={(open) => !open && !busy && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        {children}
      </DialogContent>
    </Dialog>
  )
}

function Problem({ error }: { error?: string }) {
  if (!error) return null
  return (
    <p role="alert" className="text-sm text-destructive">
      {error}
    </p>
  )
}

export function InviteLinkDialog({
  onCreate,
  onClose,
}: {
  onCreate: (role: InvitableRole, maxUses: InviteMaxUses) => Promise<{ link?: string; error?: string }>
  onClose: () => void
}) {
  const [role, setRole] = useState<InvitableRole>('member')
  const [maxUses, setMaxUses] = useState('1')
  const [link, setLink] = useState<string>()
  const [error, setError] = useState<string>()
  const [creating, setCreating] = useState(false)

  const create = async (event: FormEvent) => {
    event.preventDefault()
    setCreating(true)
    try {
      const result = await onCreate(role, maxUses === 'none' ? null : (Number(maxUses) as InviteMaxUses))
      setLink(result.link)
      setError(result.error)
    } finally {
      setCreating(false)
    }
  }

  if (link) {
    return (
      <InviteDialog
        title="Your invite link"
        description={`Send it to the people you want to join. It works for ${INVITE_DEFAULT_DAYS} days.`}
        busy={false}
        onClose={onClose}
      >
        <div className="flex flex-col gap-2">
          <CopyField label="New invite link" value={link} />
          <p className="text-xs text-muted-foreground">This is the only time the link is shown. Copy it before closing.</p>
        </div>
        <DialogFooter>
          <Button onClick={onClose}>Done</Button>
        </DialogFooter>
      </InviteDialog>
    )
  }

  return (
    <InviteDialog
      title="Create invite link"
      description="Anyone with the link can join. You choose what they may do, and how many people it lets in."
      busy={creating}
      onClose={onClose}
    >
      <form onSubmit={create} className="flex flex-col gap-5">
        <RoleChoice legend="They join as" name="invite-role" roles={INVITABLE_ROLES} value={role} onChange={setRole} />
        <div className="flex flex-col gap-2">
          <span aria-hidden className="text-sm font-medium text-foreground">
            Max uses
          </span>
          <OptionSelect label="Max uses" value={maxUses} options={INVITE_MAX_USES_OPTIONS} onChange={setMaxUses} className="w-full" />
          <p className="text-xs text-muted-foreground">
            {maxUsesSentence(maxUses)}
          </p>
        </div>
        <Problem error={error} />
        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose} disabled={creating}>
            Cancel
          </Button>
          <Button type="submit" disabled={creating}>
            {creating ? 'Creating…' : 'Create link'}
          </Button>
        </DialogFooter>
      </form>
    </InviteDialog>
  )
}

export function InviteUserDialog({
  onEmail,
  onClose,
}: {
  onEmail: (to: string, role: InvitableRole) => Promise<SubmitResult>
  onClose: () => void
}) {
  const [role, setRole] = useState<InvitableRole>('member')
  const [recipient, setRecipient] = useState('')
  const [status, setStatus] = useState<{ error?: string; sent?: string }>({})
  const [sending, setSending] = useState(false)
  const [invalid, setInvalid] = useState(false)

  const send = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const field = event.currentTarget.elements.namedItem('recipient') as HTMLInputElement
    if (!field.checkValidity()) return setInvalid(true)
    setSending(true)
    const to = recipient.trim()
    const result = await onEmail(to, role)
    setSending(false)
    setStatus(result.error ? { error: result.error } : { sent: to })
    if (!result.error) setRecipient('')
  }

  return (
    <InviteDialog
      title="Invite by email"
      description={`We’ll email them a link to join. It works for ${INVITE_DEFAULT_DAYS} days and lets one person in.`}
      busy={sending}
      onClose={onClose}
    >
      <form onSubmit={send} noValidate className="flex flex-col gap-5">
        <div className="flex flex-col gap-2">
          <label htmlFor="invite-email" className="text-sm font-medium text-foreground">
            Email
          </label>
          <Input
            id="invite-email"
            name="recipient"
            type="email"
            required
            autoFocus
            autoComplete="off"
            spellCheck={false}
            value={recipient}
            aria-invalid={invalid || undefined}
            aria-describedby={invalid ? 'invite-email-problem' : undefined}
            onChange={(event) => {
              setRecipient(event.target.value)
              setInvalid(false)
              setStatus({})
            }}
            placeholder="name@example.com"
          />
          {invalid && (
            <span id="invite-email-problem" className="text-xs text-destructive">
              Enter an email address, like name@example.com.
            </span>
          )}
        </div>
        <RoleChoice legend="They join as" name="email-invite-role" roles={INVITABLE_ROLES} value={role} onChange={setRole} />
        <Problem error={status.error} />
        {status.sent && (
          <p role="status" className="flex items-center gap-2 text-sm text-foreground">
            <CheckCircle2Icon aria-hidden className="size-4 text-success-foreground" />
            Invite sent to {status.sent}.
          </p>
        )}
        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose} disabled={sending}>
            {status.sent ? 'Done' : 'Cancel'}
          </Button>
          <Button type="submit" disabled={sending}>
            {sending ? 'Sending…' : status.sent ? 'Send another' : 'Send invite'}
          </Button>
        </DialogFooter>
      </form>
    </InviteDialog>
  )
}
