import type { WorkspaceRole } from '@repo/api'
import { WORKSPACE_ROLES } from '@repo/api/authorization.const'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import type { WorkspaceMember } from '@/types/api'
import { RoleChoice } from './role-choice'

export function RoleDialog({
  member,
  onClose,
  onSave,
}: {
  member: WorkspaceMember
  onClose: () => void
  onSave: (role: WorkspaceRole) => void
}) {
  const [role, setRole] = useState(member.role)

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent showCloseButton={false} className="sm:max-w-md">
        <form
          className="flex flex-col gap-5"
          onSubmit={(event) => {
            event.preventDefault()
            onClose()
            if (role !== member.role) onSave(role)
          }}
        >
          <DialogHeader>
            <DialogTitle>Change {member.name}’s role</DialogTitle>
            <DialogDescription>{member.email}</DialogDescription>
          </DialogHeader>
          <RoleChoice legend="Role" name="role" roles={WORKSPACE_ROLES} value={role} onChange={setRole} />
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={role === member.role}>
              Save role
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
