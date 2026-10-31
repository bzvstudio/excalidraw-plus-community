import type { WorkspaceRole } from '@repo/api'
import { useId } from 'react'
import { ROLE_DESCRIPTIONS, ROLE_LABELS } from '@/constants/roles'

export function RoleChoice<Role extends WorkspaceRole>({
  legend,
  name,
  roles,
  value,
  onChange,
}: {
  legend: string
  name: string
  roles: readonly Role[]
  value: Role
  onChange: (role: Role) => void
}) {
  const id = useId()
  return (
    <fieldset className="flex flex-col gap-2">
      <legend className="mb-2 text-sm font-medium text-foreground">{legend}</legend>
      {roles.map((role) => (
        <label
          key={role}
          className="flex cursor-pointer items-start gap-3 rounded-lg border px-3 py-2.5 transition-colors duration-150 hover:bg-accent/60 has-checked:border-foreground/30 has-checked:bg-accent has-focus-visible:ring-3 has-focus-visible:ring-ring motion-reduce:transition-none"
        >
          <input
            type="radio"
            name={name}
            value={role}
            checked={value === role}
            onChange={() => onChange(role)}
            aria-labelledby={`${id}-${role}`}
            aria-describedby={`${id}-${role}-description`}
            className="mt-0.5 size-4 shrink-0 accent-foreground outline-none"
          />
          <span className="flex flex-col gap-0.5">
            <span id={`${id}-${role}`} className="text-sm font-medium text-foreground">
              {ROLE_LABELS[role]}
            </span>
            <span id={`${id}-${role}-description`} className="text-xs text-pretty text-muted-foreground">
              {ROLE_DESCRIPTIONS[role]}
            </span>
          </span>
        </label>
      ))}
    </fieldset>
  )
}
