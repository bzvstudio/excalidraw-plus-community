import { CheckIcon, FolderPlusIcon, PlusIcon, ShapesIcon, UploadIcon, UserPlusIcon } from 'lucide-react'
import type { ComponentType, ReactNode } from 'react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

type Icon = ComponentType<{ className?: string; 'aria-hidden'?: boolean }>

export type HomeActions = {
  importing: boolean
  onCreate: () => void
  onImport: () => void
  onNewCollection?: () => void
  onInvite?: () => void
}

function QuickAction({
  icon: Icon,
  title,
  description,
  primary = false,
  disabled = false,
  onClick,
}: {
  icon: Icon
  title: string
  description: string
  primary?: boolean
  disabled?: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className="group/action flex min-w-0 items-center gap-3 rounded-xl border bg-background p-3 text-left transition-colors duration-150 outline-none select-none hover:border-input hover:bg-muted/40 focus-visible:ring-3 focus-visible:ring-ring disabled:opacity-60 motion-reduce:transition-none"
    >
      <span
        className={cn(
          'flex size-10 shrink-0 items-center justify-center rounded-lg max-sm:size-9',
          primary ? 'bg-primary text-primary-foreground' : 'bg-muted text-foreground',
        )}
      >
        <Icon aria-hidden className="size-4.5" />
      </span>
      <span className="flex min-w-0 flex-col">
        <span className="text-sm font-medium text-foreground">{title}</span>
        <span className={cn('truncate text-xs text-muted-foreground', !primary && 'max-sm:hidden')}>{description}</span>
      </span>
    </button>
  )
}

export function QuickActions({ actions }: { actions: HomeActions }) {
  return (
    <div role="group" aria-label="Quick actions" className={cn('grid grid-cols-2 gap-3', actions.onInvite && 'lg:grid-cols-3 max-lg:*:first:col-span-2')}>
      <QuickAction icon={PlusIcon} primary title="New scene" description="A blank canvas in your drafts" onClick={actions.onCreate} />
      <QuickAction
        icon={UploadIcon}
        title={actions.importing ? 'Importing…' : 'Import'}
        description="Open .excalidraw files from your computer"
        disabled={actions.importing}
        onClick={actions.onImport}
      />
      {actions.onInvite && (
        <QuickAction icon={UserPlusIcon} title="Invite people" description="Make a link that lets someone join" onClick={actions.onInvite} />
      )}
    </div>
  )
}

function Step({
  number,
  done = false,
  title,
  description,
  children,
}: {
  number: number
  done?: boolean
  title: string
  description: string
  children?: ReactNode
}) {
  return (
    <li className="flex flex-col gap-3 rounded-xl border bg-background p-4">
      <div className="flex flex-col gap-1.5">
        <div className="flex items-center gap-2.5">
          <span
            className={cn(
              'flex size-6 shrink-0 items-center justify-center rounded-full text-xs font-medium tabular-nums',
              done ? 'bg-success text-success-foreground' : 'bg-muted text-muted-foreground',
            )}
          >
            {done ? (
              <>
                <CheckIcon aria-hidden className="size-3.5" />
                <span className="sr-only">Done:</span>
              </>
            ) : (
              number
            )}
          </span>
          <h3 className="text-sm font-medium text-foreground">{title}</h3>
        </div>
        <p className="text-sm text-pretty text-muted-foreground">{description}</p>
      </div>
      {children && <div className="mt-auto flex flex-wrap gap-2 pt-1">{children}</div>}
    </li>
  )
}

export function GetStarted({ actions, hasCollections }: { actions: HomeActions; hasCollections: boolean }) {
  const steps = 1 + (actions.onNewCollection ? 1 : 0) + (actions.onInvite ? 1 : 0)

  return (
    <section aria-labelledby="get-started" className="flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <ShapesIcon aria-hidden className="size-4 text-muted-foreground" />
        <h2 id="get-started" className="text-sm font-semibold text-foreground">
          Get started
        </h2>
      </div>
      <ol className={cn('grid gap-3', steps === 3 ? 'md:grid-cols-3' : steps === 2 ? 'md:grid-cols-2' : '')}>
        <Step
          number={1}
          title="Draw your first scene"
          description="New scenes start in your drafts, where only you can see them, until you move them somewhere shared."
        >
          <Button size="sm" onClick={actions.onCreate}>
            <PlusIcon aria-hidden />
            New scene
          </Button>
          <Button size="sm" variant="outline" disabled={actions.importing} onClick={actions.onImport}>
            <UploadIcon aria-hidden />
            {actions.importing ? 'Importing…' : 'Import a file'}
          </Button>
        </Step>
        {actions.onNewCollection && (
          <Step
            number={2}
            done={hasCollections}
            title="Make a collection"
            description="Collections hold the scenes everyone in the workspace can open. You can keep one to certain teams later."
          >
            <Button size="sm" variant="outline" onClick={actions.onNewCollection}>
              <FolderPlusIcon aria-hidden />
              New collection
            </Button>
          </Step>
        )}
        {actions.onInvite && (
          <Step
            number={steps}
            title="Bring in your team"
            description="Share an invite link and choose whether the people who use it can edit or only view."
          >
            <Button size="sm" variant="outline" onClick={actions.onInvite}>
              <UserPlusIcon aria-hidden />
              Invite people
            </Button>
          </Step>
        )}
      </ol>
    </section>
  )
}
