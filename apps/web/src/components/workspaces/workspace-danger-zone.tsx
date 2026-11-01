import { useState } from 'react'
import { SettingsCard, SettingsRow } from '@/components/settings/settings-section'
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { MemberKeysDialog } from '@/components/workspaces/member-keys-dialog'
import { ROLE_LABELS } from '@/constants/roles'
import type { ApiKeyItem, WorkspaceMember } from '@/types/api'
import type { SubmitResult } from '@/types/forms'

type Dialog = 'leave' | 'delete'

function SuccessorSelect({
  members,
  value,
  onChange,
}: {
  members: WorkspaceMember[]
  value: string | null
  onChange: (userId: string | null) => void
}) {
  const options = members.map((member) => ({ value: member.userId, label: `${member.name} · ${ROLE_LABELS[member.role]}` }))
  return (
    <label className="flex flex-col gap-2 text-sm font-medium">
      <span>New admin</span>
      <Select items={options} value={value} onValueChange={onChange}>
        <SelectTrigger aria-label="New admin" className="w-full">
          <SelectValue placeholder="Choose someone" />
        </SelectTrigger>
        <SelectContent>
          {options.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </label>
  )
}

function DeleteWorkspaceDialog({
  workspaceName,
  alone,
  othersCount,
  onClose,
  onConfirm,
}: {
  workspaceName: string
  alone: boolean
  othersCount: number
  onClose: () => void
  onConfirm: () => Promise<SubmitResult>
}) {
  const [typed, setTyped] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string>()
  const action = alone ? 'Leave and delete workspace' : 'Delete workspace'

  const submit = async (event: React.FormEvent) => {
    event.preventDefault()
    if (typed !== workspaceName) return
    setBusy(true)
    const result = await onConfirm()
    setBusy(false)
    if (result.error) setError(result.error)
    else onClose()
  }

  return (
    <AlertDialog open onOpenChange={(open) => !open && !busy && onClose()}>
      <AlertDialogContent className="sm:max-w-md">
        <form onSubmit={submit} className="flex flex-col gap-5">
          <AlertDialogHeader>
            <AlertDialogTitle>{alone ? `Leave and delete ${workspaceName}?` : `Delete ${workspaceName}?`}</AlertDialogTitle>
            <AlertDialogDescription>
              {alone && 'You’re the only person here, so leaving deletes the workspace. '}
              This permanently removes every scene and image, along with comments, collections, teams, share links, API keys and the
              activity log. It can’t be undone.
              {othersCount > 0 && ` ${othersCount === 1 ? '1 other person loses' : `${othersCount} other people lose`} access straight away.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <label className="flex flex-col gap-2 text-sm font-medium">
            <span>Type {workspaceName} to confirm</span>
            <Input
              value={typed}
              onChange={(event) => setTyped(event.target.value)}
              autoComplete="off"
              spellCheck={false}
              autoFocus
              disabled={busy}
            />
          </label>
          {error && (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          )}
          <AlertDialogFooter>
            <Button type="button" variant="outline" onClick={onClose} disabled={busy}>
              Cancel
            </Button>
            <Button type="submit" variant="destructive" disabled={busy || typed !== workspaceName}>
              {busy ? 'Deleting…' : action}
            </Button>
          </AlertDialogFooter>
        </form>
      </AlertDialogContent>
    </AlertDialog>
  )
}

export function WorkspaceDangerZone({
  workspaceName,
  canManage,
  currentUserId,
  members,
  apiKeys,
  onLeave,
  onDelete,
}: {
  workspaceName: string
  canManage: boolean
  currentUserId: string
  members: WorkspaceMember[] | 'loading' | 'failed'
  apiKeys: ApiKeyItem[] | 'loading' | 'failed'
  onLeave: (departure: { transferTo?: string; revokeKeyIds: string[] }) => Promise<SubmitResult>
  onDelete: () => Promise<SubmitResult>
}) {
  const [dialog, setDialog] = useState<Dialog>()
  const [successor, setSuccessor] = useState<string | null>(null)
  const close = () => {
    setDialog(undefined)
    setSuccessor(null)
  }

  const loaded = Array.isArray(members)
  const others = loaded ? members.filter(({ userId }) => userId !== currentUserId) : []
  const alone = loaded && others.length === 0
  const mustHandOver = loaded && canManage && !alone && !others.some(({ role }) => role === 'admin')
  const myKeys = Array.isArray(apiKeys)
    ? apiKeys.filter((key) => key.createdBy === currentUserId && key.status === 'active')
    : apiKeys

  const leaveDescription = !loaded
    ? 'Stop being part of this workspace.'
    : alone
      ? 'You’re the only person here, so leaving deletes the workspace and everything in it.'
      : mustHandOver
        ? 'You’re the only admin, so you’ll choose someone to take over before you go.'
        : 'You lose access to its scenes straight away. You’ll need a new invite to come back.'

  return (
    <div>
      <SettingsCard title="Danger zone" className="border-destructive/40">
        <SettingsRow label="Leave workspace" description={leaveDescription}>
          <Button variant="outline" disabled={!loaded} onClick={() => setDialog(alone ? 'delete' : 'leave')}>
            Leave workspace
          </Button>
        </SettingsRow>
        {canManage && (
          <SettingsRow
            label="Delete workspace"
            description="Permanently removes the workspace, its scenes and images, for everyone. It can’t be undone."
          >
            <Button variant="destructive" disabled={!loaded} onClick={() => setDialog('delete')}>
              Delete workspace
            </Button>
          </SettingsRow>
        )}
      </SettingsCard>
      {dialog === 'leave' && (
        <MemberKeysDialog
          self
          title={`Leave ${workspaceName}?`}
          consequence={
            mustHandOver
              ? `You’re the only admin, so the person you choose becomes an admin. You lose access straight away and need a new invite to come back.`
              : `You lose access to everything in ${workspaceName} straight away and need a new invite to come back.`
          }
          action="Leave workspace"
          keys={myKeys}
          ready={!mustHandOver || successor !== null}
          onClose={close}
          onConfirm={(revokeKeyIds) => onLeave({ transferTo: mustHandOver ? (successor ?? undefined) : undefined, revokeKeyIds })}
        >
          {mustHandOver && <SuccessorSelect members={others} value={successor} onChange={setSuccessor} />}
        </MemberKeysDialog>
      )}
      {dialog === 'delete' && (
        <DeleteWorkspaceDialog
          workspaceName={workspaceName}
          alone={alone}
          othersCount={others.length}
          onClose={close}
          onConfirm={onDelete}
        />
      )}
    </div>
  )
}
