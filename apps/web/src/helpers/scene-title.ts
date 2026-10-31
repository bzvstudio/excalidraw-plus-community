import { DEFAULT_SCENE_TITLE, SCENE_TITLE_MAX_LENGTH } from '@repo/api/scenes.const'

export function sceneTitleOf(fileName: string): string {
  const title = fileName.replace(/\.excalidraw(\.json)?$/i, '').trim().slice(0, SCENE_TITLE_MAX_LENGTH)
  return title || DEFAULT_SCENE_TITLE
}
