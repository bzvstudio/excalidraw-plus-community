import { Link, useRouter } from '@tanstack/react-router'
import { FileQuestionIcon, TriangleAlertIcon } from 'lucide-react'
import type { ComponentType, ReactNode } from 'react'
import { AuthCard } from '@/components/auth/auth-card'
import { AuthFrameLayout } from '@/components/auth/auth-frame'
import { Button, buttonVariants } from '@/components/ui/button'
import { asSentence, messageOf } from '@/helpers/results'
import { workspaceLink } from '@/helpers/places'
import { useWorkspace } from '@/hooks/use-workspace'

function BackToWorkspace() {
  const { workspace } = useWorkspace()
  return (
    <Link {...workspaceLink(workspace.slug)} className={buttonVariants({ size: 'lg', className: 'w-full' })}>
      <span className="truncate">Back to {workspace.name}</span>
    </Link>
  )
}

export function SceneUnavailable({ error }: { error: unknown }) {
  const router = useRouter()
  return (
    <SceneUnavailablePage
      icon={TriangleAlertIcon}
      title="This scene didn't open"
      message={asSentence(messageOf(error))}
      actions={
        <>
          <BackToWorkspace />
          <Button variant="outline" size="lg" onClick={() => void router.invalidate()}>
            Try again
          </Button>
        </>
      }
    />
  )
}

export function SceneNotFound() {
  return (
    <SceneUnavailablePage
      icon={FileQuestionIcon}
      title="We couldn't find this scene"
      message="It may have been deleted, or it's somewhere you don't have access to. Ask whoever sent it to share it with you."
      actions={<BackToWorkspace />}
    />
  )
}

export function SceneUnavailablePage({
  icon,
  title,
  message,
  actions,
}: {
  icon: ComponentType<{ className?: string; 'aria-hidden'?: boolean }>
  title: string
  message: string
  actions: ReactNode
}) {
  return (
    <AuthFrameLayout>
      <AuthCard icon={icon} title={title} description={message}>
        {actions}
      </AuthCard>
    </AuthFrameLayout>
  )
}
