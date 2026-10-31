import { store } from "../../stores/index.js";
import type { Executor } from "../../stores/database.js";
import { actorCan, isApiKey, WorkspaceAccessDenied } from "../authorization/authorization.utils.js";
import { UnknownCollection } from "../collections/collections.utils.js";
import { UnknownScene } from "../scenes/scenes.utils.js";
import type { AccessService } from "./access.type.js";
import { apiKeyViewerId, isCollectionOpenTo, sceneAccessOf } from "./access.utils.js";

export function createAccessService(): AccessService {
  const viewerFor: AccessService["viewerFor"] = async (actor, db) => {
    if (isApiKey(actor)) return { userId: apiKeyViewerId(actor.keyId), seesEverything: false, teamIds: [] };
    if (actorCan(actor, "workspace.manage")) return { userId: actor.userId, seesEverything: true, teamIds: [] };
    const teams = await store.teamMembers.getAllTeamIdsByUserIdAndWorkspaceId(actor.userId, actor.workspaceId, db);
    return { userId: actor.userId, seesEverything: false, teamIds: teams.map(({ teamId }) => teamId) };
  };

  const restrictionsOf = async (collectionId: string | null, db?: Executor) =>
    collectionId === null
      ? []
      : (await store.collectionTeams.getAllTeamIdsByCollectionId(collectionId, db)).map(({ teamId }) => teamId);

  const sceneAccess: AccessService["sceneAccess"] = async (actor, scene, db) => {
    const viewer = await viewerFor(actor, db);
    const restrictedTo = viewer.seesEverything ? [] : await restrictionsOf(scene.collectionId, db);
    return sceneAccessOf(actorCan(actor, "scene.edit"), viewer, scene, restrictedTo);
  };

  return {
    viewerFor,
    sceneAccess,

    sceneAccessById: async (actor, sceneId, db) => {
      const scene = await store.scenes.getSummaryByIdAndWorkspaceId(sceneId, actor.workspaceId, db);
      return scene ? sceneAccess(actor, scene, db) : "none";
    },

    requireScene: async (actor, scene, needs, db) => {
      const access = scene ? await sceneAccess(actor, scene, db) : "none";
      if (!scene || access === "none") throw new UnknownScene();
      if (needs === "edit" && access !== "edit") throw new WorkspaceAccessDenied("scene.edit");
      return scene;
    },

    requireCollection: async (actor, collection, db) => {
      if (!collection) throw new UnknownCollection();
      const viewer = await viewerFor(actor, db);
      if (!viewer.seesEverything && !isCollectionOpenTo(viewer, await restrictionsOf(collection.id, db))) {
        throw new UnknownCollection();
      }
      return collection;
    },
  };
}
