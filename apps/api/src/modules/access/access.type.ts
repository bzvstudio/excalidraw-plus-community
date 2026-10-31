import type { CollectionRow, SceneRow } from "@repo/db";
import type { CollectionViewer } from "../../stores/collection-teams.store.js";
import type { Executor } from "../../stores/database.js";
import type { Actor } from "../authorization/authorization.type.js";

export type Viewer = CollectionViewer;

export type SceneAccess = "none" | "view" | "edit";

export type AccessibleScene = Pick<SceneRow, "collectionId" | "createdBy">;

export type AccessChange = { workspaceId: string } | { sceneId: string };

export type AccessChanged = (change: AccessChange) => void;

export type AccessService = {
  viewerFor: (actor: Actor, db?: Executor) => Promise<Viewer>;
  sceneAccess: (actor: Actor, scene: AccessibleScene, db?: Executor) => Promise<SceneAccess>;
  sceneAccessById: (actor: Actor, sceneId: string, db?: Executor) => Promise<SceneAccess>;
  requireScene: <Scene extends AccessibleScene>(
    actor: Actor,
    scene: Scene | undefined,
    needs: Exclude<SceneAccess, "none">,
    db?: Executor,
  ) => Promise<Scene>;
  requireCollection: <Collection extends Pick<CollectionRow, "id">>(
    actor: Actor,
    collection: Collection | undefined,
    db?: Executor,
  ) => Promise<Collection>;
};
