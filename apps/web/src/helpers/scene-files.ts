import { SCENE_FILE } from '@/constants/scenes'

export function sceneFilesOf(list: FileList | readonly File[] | null | undefined): File[] {
  return [...(list ?? [])].filter((file) => SCENE_FILE.test(file.name))
}
