export function newScenePlace(shownCollectionId: string | undefined, openScene: { collectionId: string | null } | undefined): string | undefined {
  if (openScene) return openScene.collectionId ?? undefined
  return shownCollectionId
}
