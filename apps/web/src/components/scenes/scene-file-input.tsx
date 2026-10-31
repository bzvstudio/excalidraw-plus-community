import type { Ref } from 'react'
import { SCENE_FILE_ACCEPT } from '@/constants/scenes'
import { sceneFilesOf } from '@/helpers/scene-files'

export function SceneFileInput({
  ref,
  label = 'Import .excalidraw files',
  onFiles,
}: {
  ref?: Ref<HTMLInputElement>
  label?: string
  onFiles: (files: File[]) => void
}) {
  return (
    <input
      ref={ref}
      type="file"
      multiple
      accept={SCENE_FILE_ACCEPT}
      aria-label={label}
      className="hidden"
      onChange={(event) => {
        const files = sceneFilesOf(event.target.files)
        event.target.value = ''
        if (files.length > 0) onFiles(files)
      }}
    />
  )
}
