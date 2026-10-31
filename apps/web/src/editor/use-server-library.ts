import { mergeLibraryItems, useHandleLibrary } from '@excalidraw/excalidraw'
import type { LibraryItems } from '@excalidraw/excalidraw/types'
import { LIBRARY_SITE } from '@repo/api/library.const'
import { useMemo } from 'react'
import type { LibraryItemData } from '@/types/api'
import type { EditorApi } from './files'
import { createLibrarySync, type RemoteLibrary } from './library-sync'
import { fromLibraryItemData, toLibraryItemData } from './scene-adapter'

type LibraryItem = LibraryItems[number]

function mergeItems(remote: LibraryItem[], local: LibraryItem[]): LibraryItem[] {
  const seen = new Set<string>()
  return mergeLibraryItems(local, remote).filter((item) => !seen.has(item.id) && seen.add(item.id))
}

export function useServerLibrary(
  api: EditorApi | null,
  server: Omit<RemoteLibrary<LibraryItemData>, 'merge' | 'onMerged'>,
  browsing: boolean,
) {
  const { load, save, isConflict } = server
  const adapter = useMemo(
    () =>
      createLibrarySync<LibraryItem>({
        load: async () => {
          const library = await load()
          return { items: fromLibraryItemData(library.items), version: library.version }
        },
        save: (items, basedOn) => save(toLibraryItemData(items), basedOn),
        isConflict,
        merge: mergeItems,
        onMerged: (items) => void api?.updateLibrary({ libraryItems: items, merge: true }),
      }),
    [api, load, save, isConflict],
  )

  useHandleLibrary({
    excalidrawAPI: api,
    adapter,
    validateLibraryUrl: (url) => browsing && new URL(url).origin === LIBRARY_SITE,
  })
}
