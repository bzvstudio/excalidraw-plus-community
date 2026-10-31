import { useRouter } from '@tanstack/react-router'
import type { WorkspaceRole } from '@repo/api'
import { SCENE_TITLE_MAX_LENGTH } from '@repo/api/scenes.const'
import { type ReactNode, useMemo, useState } from 'react'
import { toast } from 'sonner'
import { NameDialog } from '@/components/name-dialog'
import { DeleteSceneDialog } from '@/components/scenes/delete-scene-dialog'
import type { SceneActions } from '@/components/scenes/scene-card'
import { sceneLink } from '@/helpers/places'
import { messageOf } from '@/helpers/results'
import { canEditScenes, canManageWorkspace } from '@/helpers/roles'
import { deleteScene, moveScene, renameScene } from '@/services/scenes/scenes'
import type { Collection, SceneListItem } from '@/types/api'

type Dialog = { kind: 'rename'; scene: SceneListItem } | { kind: 'delete'; scene: SceneListItem }

export function useSceneActions({
  workspaceId,
  workspaceSlug,
  role,
  collections,
}: {
  workspaceId: string
  workspaceSlug: string
  role: WorkspaceRole
  collections: Collection[] | undefined
}): { actions: SceneActions; dialog: ReactNode } {
  const router = useRouter()
  const [dialog, setDialog] = useState<Dialog>()
  const canEdit = canEditScenes(role)
  const canManage = canManageWorkspace(role)

  const actions = useMemo<SceneActions>(() => {
    const failed = (what: string) => (error: unknown) => toast.error(what, { description: messageOf(error) })

    const move = (scene: SceneListItem, to: string | null, undo = true) => {
      const from = scene.collectionId
      const name = to === null ? 'Drafts' : (collections?.find(({ id }) => id === to)?.name ?? 'the collection')
      moveScene(workspaceId, scene, to).then(
        () =>
          toast(`Moved “${scene.title}” to ${name}`, {
            action: undo ? { label: 'Undo', onClick: () => move({ ...scene, collectionId: to }, from, false) } : undefined,
          }),
        failed(`Could not move “${scene.title}”`),
      )
    }

    return {
      onCopyLink: (scene) => {
        const href = new URL(router.buildLocation(sceneLink(workspaceSlug, scene.id)).href, window.location.origin).href
        navigator.clipboard.writeText(href).then(
          () => toast('Link copied'),
          () => toast.error('Could not copy the link', { description: href }),
        )
      },
      edit: canEdit
        ? {
            collections: collections ?? [],
            canMoveOutOfRestricted: canManage,
            onRename: (scene) => setDialog({ kind: 'rename', scene }),
            onMove: (scene, to) => move(scene, to),
            onDelete: (scene) => setDialog({ kind: 'delete', scene }),
          }
        : undefined,
    }
  }, [canEdit, canManage, collections, router, workspaceId, workspaceSlug])

  const close = () => setDialog(undefined)

  const node =
    dialog?.kind === 'rename' ? (
      <NameDialog
        title="Rename scene"
        label="Scene name"
        initial={dialog.scene.title}
        maxLength={SCENE_TITLE_MAX_LENGTH}
        onClose={close}
        onSubmit={async (title) => {
          const scene = dialog.scene
          if (title !== scene.title) {
            renameScene(workspaceId, scene, title).catch((error: unknown) =>
              toast.error(`Could not rename “${scene.title}”`, { description: messageOf(error) }),
            )
          }
          return {}
        }}
      />
    ) : dialog?.kind === 'delete' ? (
      <DeleteSceneDialog
        scene={dialog.scene}
        onClose={close}
        onConfirm={async () => {
          const scene = dialog.scene
          deleteScene(workspaceId, scene.id).catch((error: unknown) =>
            toast.error(`Could not delete “${scene.title}”`, { description: messageOf(error) }),
          )
          return {}
        }}
      />
    ) : null

  return { actions, dialog: node }
}
