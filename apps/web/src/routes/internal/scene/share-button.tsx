import { useQuery } from '@tanstack/react-query'
import { UserPlusIcon } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
import { ShareAccess, SharePanel } from '@/components/scenes/share-panel'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { attempt } from '@/helpers/results'
import type { Visibility } from '@/helpers/visibility'
import { type CreatedLink, createShareLink, revokeShareLink } from '@/services/shares/shares'
import { trpc } from '@/trpc'

export function ShareButton({
  workspaceId,
  sceneId,
  title,
  sceneUrl,
  visibility,
  guestEditLinks,
}: {
  workspaceId: string
  sceneId: string
  title: string
  sceneUrl: string
  visibility?: Visibility
  guestEditLinks: boolean
}) {
  const [open, setOpen] = useState(false)
  const [error, setError] = useState<string>()
  const links = useQuery({ ...trpc.shares.list.queryOptions({ workspaceId, sceneId }), enabled: open })

  return (
    <>
      <Button size="sm" className="max-md:w-8 max-md:px-0" aria-label="Share" onClick={() => setOpen(true)}>
        <UserPlusIcon aria-hidden />
        <span className="max-md:hidden">Share</span>
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[calc(100dvh-2rem)] overflow-x-hidden overflow-y-auto sm:max-w-[34rem] [&>*]:min-w-0">
          <DialogHeader>
            <DialogTitle className="truncate">Share “{title}”</DialogTitle>
            <DialogDescription>Choose who can open this scene, inside the workspace and out.</DialogDescription>
          </DialogHeader>
          <ShareAccess visibility={visibility} sceneUrl={sceneUrl} />
          <SharePanel
            links={links.data}
            guestEditLinks={guestEditLinks}
            error={error}
            onCreate={async (role, validForDays) => {
              let created: CreatedLink | undefined
              const result = await attempt(async () => {
                created = await createShareLink(workspaceId, sceneId, role, validForDays)
              })
              setError(result.error)
              return created
            }}
            onRevoke={async (link) => {
              const result = await attempt(() => revokeShareLink(workspaceId, sceneId, link.id))
              setError(result.error)
              if (!result.error) toast('Link turned off')
            }}
          />
        </DialogContent>
      </Dialog>
    </>
  )
}
