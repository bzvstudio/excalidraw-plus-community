export type RemoteLibrary<Item> = {
  load: () => Promise<{ items: Item[]; version: number }>
  save: (items: Item[], basedOn: number) => Promise<{ version: number }>
  isConflict: (error: unknown) => boolean
  merge: (remote: Item[], local: Item[]) => Item[]
  onMerged?: (items: Item[]) => void
}

const SAVE_ATTEMPTS = 3

export function createLibrarySync<Item>(remote: RemoteLibrary<Item>) {
  let version = 0
  let unsaved: Item[] = []

  return {
    load: async () => {
      const library = await remote.load()
      version = library.version
      return { libraryItems: library.items }
    },

    save: async ({ libraryItems }: { libraryItems: Item[] }) => {
      let items = unsaved.length ? remote.merge(unsaved, libraryItems) : libraryItems
      let merged = unsaved.length > 0
      for (let attempt = 1; ; attempt++) {
        try {
          version = (await remote.save(items, version)).version
          unsaved = []
          if (merged) remote.onMerged?.(items)
          return
        } catch (error) {
          if (!remote.isConflict(error) || attempt === SAVE_ATTEMPTS) {
            unsaved = items
            throw error
          }
          const latest = await remote.load()
          version = latest.version
          items = remote.merge(latest.items, items)
          merged = true
        }
      }
    },
  }
}
