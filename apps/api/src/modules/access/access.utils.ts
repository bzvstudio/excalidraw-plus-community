import type { AccessChange, AccessibleScene, SceneAccess, Viewer } from "./access.type.js";

export function isCollectionOpenTo(viewer: Viewer, restrictedTo: readonly string[]): boolean {
  return viewer.seesEverything || restrictedTo.length === 0 || restrictedTo.some((teamId) => viewer.teamIds.includes(teamId));
}

export function sceneAccessOf(
  edits: boolean,
  viewer: Viewer,
  scene: AccessibleScene,
  restrictedTo: readonly string[],
): SceneAccess {
  const visible =
    viewer.seesEverything ||
    (scene.collectionId === null ? scene.createdBy === viewer.userId : isCollectionOpenTo(viewer, restrictedTo));
  if (!visible) return "none";
  return edits ? "edit" : "view";
}

export function apiKeyViewerId(keyId: string): string {
  return `api-key:${keyId}`;
}

export function createAccessChangeLog() {
  let latest = 0;
  let everyScene = 0;
  let watchers = 0;
  const byWorkspace = new Map<string, number>();
  const byScene = new Map<string, number>();
  return {
    mark: () => latest,
    record: (change: AccessChange | "everything") => {
      latest += 1;
      if (change === "everything") everyScene = latest;
      else if (watchers > 0 && "sceneId" in change) byScene.set(change.sceneId, latest);
      else if (watchers > 0 && "workspaceId" in change) byWorkspace.set(change.workspaceId, latest);
    },
    changedSince: (mark: number, scene: { workspaceId: string; sceneId: string }) =>
      Math.max(everyScene, byWorkspace.get(scene.workspaceId) ?? 0, byScene.get(scene.sceneId) ?? 0) > mark,
    watch: () => {
      watchers += 1;
      let stopped = false;
      return () => {
        if (stopped) return;
        stopped = true;
        watchers -= 1;
        if (watchers > 0) return;
        byWorkspace.clear();
        byScene.clear();
      };
    },
  };
}
