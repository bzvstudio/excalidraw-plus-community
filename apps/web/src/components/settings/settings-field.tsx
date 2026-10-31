import type { ReactNode } from 'react'

export function SettingsField({
  id,
  label,
  hint,
  error,
  children,
}: {
  id: string
  label: string
  hint?: ReactNode
  error?: string
  children: ReactNode
}) {
  return (
    <div className="flex flex-col gap-2">
      <label htmlFor={id} className="text-sm font-medium text-foreground">
        {label}
      </label>
      {children}
      <span id={`${id}-note`} className={error ? 'text-xs text-destructive' : 'text-xs text-muted-foreground'}>
        {error ?? hint}
      </span>
    </div>
  )
}
