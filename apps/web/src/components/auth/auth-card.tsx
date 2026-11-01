import type { ComponentType, ReactNode } from 'react'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { cn } from '@/lib/utils'

export const AUTH_LINK =
  'rounded-sm font-medium text-foreground underline decoration-foreground/30 underline-offset-4 transition-colors duration-150 outline-none hover:decoration-foreground focus-visible:ring-3 focus-visible:ring-ring motion-reduce:transition-none'

export function AuthCard({
  icon: Icon,
  title,
  titleAside,
  align = 'center',
  description,
  error,
  footer,
  children,
}: {
  icon?: ComponentType<{ className?: string; 'aria-hidden'?: boolean }>
  title: string
  titleAside?: ReactNode
  align?: 'center' | 'start'
  description?: ReactNode
  error?: string
  footer?: ReactNode
  children?: ReactNode
}) {
  return (
    <section aria-labelledby="auth-title" className="flex w-full max-w-sm flex-col gap-5">
      <div className="rounded-2xl border bg-background p-6 sm:p-8">
        <div className={cn('flex flex-col gap-1.5', align === 'center' ? 'items-center text-center' : 'items-start text-left')}>
          {Icon && (
            <span className="mb-2.5 flex size-10 items-center justify-center rounded-xl bg-muted text-muted-foreground">
              <Icon aria-hidden className="size-5" />
            </span>
          )}
          <div className="flex items-center gap-1.5">
            <h1 id="auth-title" className="text-xl font-semibold tracking-tight text-balance text-foreground">
              {title}
            </h1>
            {titleAside}
          </div>
          {description && <p className="text-sm text-pretty text-muted-foreground">{description}</p>}
        </div>
        {(error || children) && (
          <div className="mt-6 flex flex-col gap-4 text-left">
            {error && (
              <Alert variant="destructive">
                <AlertDescription className="text-pretty">{error}</AlertDescription>
              </Alert>
            )}
            {children}
          </div>
        )}
      </div>
      {footer && (
        <div className="flex flex-col items-center gap-2 text-center text-sm text-muted-foreground">
          {footer}
        </div>
      )}
    </section>
  )
}
