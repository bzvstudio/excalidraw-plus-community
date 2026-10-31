import { randomUUID } from "node:crypto";
import { auditActorOf, auditEvent } from "../audit/audit.utils.js";
import { store } from "../../stores/index.js";
import type { SceneRow } from "@repo/db";
import type { DrizzleTransaction } from "../../stores/database.js";
import { actorCan, assertCan, isApiKey } from "../authorization/authorization.utils.js";
import type { AccessChanged, AccessService } from "../access/access.type.js";
import type { Sealer } from "../encryption/encryption.type.js";
import type { FilesService } from "../files/files.type.js";
import { DEFAULT_SCENE_TITLE } from "./scenes.const.js";
import type { Actor } from "../authorization/authorization.type.js";
import { UnknownFile } from "../files/files.utils.js";
import type {
  Scene,
  SceneContent,
  SceneElement,
  SceneExport,
  SceneLimits,
  ScenePatch,
  ScenesService,
  SceneSummary,
  StoredScene,
} from "./scenes.type.js";
import { anchorOf, anchorPoint } from "../comments/comments.utils.js";
import {
  adoptContent,
  authorOf,
  fitsLimits,
  mayDeleteScene,
  mergeElements,
  openContent,
  pageOf,
  pickSceneAppState,
  sealContent,
  SceneDeleteDenied,
  SceneDraftDenied,
  SceneMoveDenied,
  SceneNeedsCollection,
  SceneTooLarge,
  toSceneListItem,
  toSceneSummary,
  UnknownScene,
} from "./scenes.utils.js";

const EMPTY_SCENE: SceneContent = { elements: [], appState: {} };

export function createScenesService(options: {
  limits: SceneLimits;
  sealer: Sealer;
  files: Pick<FilesService, "removeAllOf" | "check" | "get" | "keepWithin">;
  access: AccessService;
  accessChanged?: AccessChanged;
  log: (line: string) => void;
  now?: () => Date;
  generateId?: () => string;
}): ScenesService {
  const { limits, sealer, files, access, log } = options;
  const accessChanged = options.accessChanged ?? (() => undefined);
  const generateId = options.generateId ?? randomUUID;
  const now = options.now ?? (() => new Date());

  const pinThreadsOfPruned = async (
    sceneId: string,
    before: readonly SceneElement[],
    after: readonly SceneElement[],
    tx: DrizzleTransaction,
  ) => {
    const kept = new Set(after.map(({ id }) => id));
    const pruned = new Map(before.filter(({ id }) => !kept.has(id)).map((element) => [element.id, element]));
    if (pruned.size === 0) return;
    for (const thread of await store.commentThreads.getAllBySceneIdAndElementIds(sceneId, [...pruned.keys()], tx)) {
      const point = anchorPoint(anchorOf(thread), pruned);
      await store.commentThreads.updateByIdAndSceneId(
        thread.id,
        sceneId,
        { ...point, elementId: null, offsetX: null, offsetY: null },
        tx,
      );
    }
  };

  const writeChanges = async (
    row: SceneRow,
    changes: SceneContent,
    updatedBy: string | null,
    tx: DrizzleTransaction,
  ): Promise<StoredScene> => {
    const savedAt = now();
    const stored = openContent(sealer, row);
    const content: SceneContent = {
      elements: mergeElements(stored.elements, changes.elements, savedAt.getTime()),
      appState: { ...stored.appState, ...pickSceneAppState(changes.appState) },
    };
    if (!fitsLimits(content, limits)) throw new SceneTooLarge(limits);
    await pinThreadsOfPruned(row.id, [...stored.elements, ...changes.elements], content.elements, tx);
    const version = row.version + 1;
    await store.scenes.updateByIdAndWorkspaceId(
      row.id,
      row.workspaceId,
      { ...sealContent(sealer, row.id, content), version, updatedBy, updatedAt: savedAt },
      tx,
    );
    return { version, ...content };
  };

  const changeScene = async (actor: Actor, sceneId: string, patch: ScenePatch): Promise<SceneSummary> => {
    assertCan(actor, "scene.edit");
    const changed = await store.transaction(async (tx) => {
      const scene = await access.requireScene(
        actor,
        await store.scenes.getByIdAndWorkspaceIdForNoKeyUpdate(sceneId, actor.workspaceId, tx),
        "edit",
        tx,
      );
      const { collectionId } = patch;
      if (collectionId !== undefined) {
        if (collectionId === null && (isApiKey(actor) || !mayDeleteScene(actor, scene.createdBy))) throw new SceneDraftDenied();
        if (scene.collectionId && !actorCan(actor, "workspace.manage")) {
          const restrictedTo = await store.collectionTeams.getAllTeamIdsByCollectionId(scene.collectionId, tx);
          if (restrictedTo.length > 0) throw new SceneMoveDenied();
        }
        if (collectionId) {
          await access.requireCollection(
            actor,
            await store.collections.getByIdAndWorkspaceIdForKeyShare(collectionId, actor.workspaceId, tx),
            tx,
          );
        }
      }
      const row = await store.scenes.updateByIdAndWorkspaceId(sceneId, actor.workspaceId, patch, tx);
      if (!row) throw new UnknownScene();
      if (collectionId !== undefined && collectionId !== scene.collectionId) {
        await store.auditEvents.add(
          auditEvent({
            workspaceId: actor.workspaceId,
            action: "scene.moved",
            actor: auditActorOf(actor),
            target: { kind: "scene", id: sceneId, label: row.title },
            metadata: { fromCollectionId: scene.collectionId, toCollectionId: collectionId },
            at: now(),
          }),
          tx,
        );
      }
      return toSceneSummary(actor, row);
    });
    if (patch.collectionId !== undefined) accessChanged({ sceneId });
    return changed;
  };

  const getScene = async (actor: Actor, sceneId: string): Promise<Scene> => {
    assertCan(actor, "scene.view");
    const row = await access.requireScene(actor, await store.scenes.getByIdAndWorkspaceId(sceneId, actor.workspaceId), "view");
    return { ...toSceneSummary(actor, row), ...openContent(sealer, row) };
  };

  return {
    list: async (actor, filter = {}) => {
      assertCan(actor, "scene.view");
      const rows = await store.scenes.getAllWithUsersAndSceneThumbnailsByWorkspaceIdVisibleTo(
        actor.workspaceId,
        await access.viewerFor(actor),
        filter,
      );
      return rows.map((row) => toSceneListItem(actor, row));
    },

    listPage: async (actor, filter, page) => {
      assertCan(actor, "scene.view");
      const rows = await store.scenes.getAllWithUsersAndSceneThumbnailsByWorkspaceIdVisibleTo(
        actor.workspaceId,
        await access.viewerFor(actor),
        filter,
      );
      const { items, nextCursor } = pageOf(rows, page);
      return {
        items: items.map((row) => toSceneListItem(actor, row)),
        nextCursor,
      };
    },

    get: getScene,

    export: async (actor, sceneId, { withFiles }) => {
      const stored = await getScene(actor, sceneId);
      const scene = { ...stored, elements: stored.elements.filter((element) => !element.isDeleted) };
      const fileIds = withFiles
        ? new Set(scene.elements.flatMap((element) => (typeof element.fileId === "string" ? [element.fileId] : [])))
        : new Set<string>();
      const found: SceneExport["files"] = [];
      for (const fileId of fileIds) {
        try {
          found.push({ id: fileId, ...(await files.get(actor, sceneId, fileId)) });
        } catch (error) {
          if (!(error instanceof UnknownFile)) throw error;
        }
      }
      return { scene, files: found };
    },

    create: async (actor, { title = DEFAULT_SCENE_TITLE, collectionId, content = EMPTY_SCENE, files: uploads = [] } = {}) => {
      assertCan(actor, "scene.create");
      if (isApiKey(actor) && !collectionId) throw new SceneNeedsCollection();
      for (const upload of uploads) files.check(upload.bytes);
      const createdAt = now();
      const initial = {
        elements: mergeElements([], content.elements, createdAt.getTime()),
        appState: pickSceneAppState(content.appState),
      };
      if (!fitsLimits(initial, limits)) throw new SceneTooLarge(limits);
      const id = generateId();
      const row = {
        workspaceId: actor.workspaceId,
        collectionId: collectionId ?? null,
        title,
        version: 1,
        createdBy: authorOf(actor),
        updatedBy: authorOf(actor),
        createdAt,
        updatedAt: createdAt,
      };
      await store.transaction(async (tx) => {
        if (collectionId) {
          await access.requireCollection(
            actor,
            await store.collections.getByIdAndWorkspaceIdForKeyShare(collectionId, actor.workspaceId, tx),
            tx,
          );
        }
        await store.scenes.add({ id, ...row, ...sealContent(sealer, id, initial) }, tx);
        for (const upload of uploads) await files.keepWithin(actor.workspaceId, id, upload.id, upload.bytes, authorOf(actor), tx);
      });
      return toSceneSummary(actor, { id, ...row });
    },

    rename: (actor, sceneId, title) => changeScene(actor, sceneId, { title }),

    move: (actor, sceneId, collectionId) => changeScene(actor, sceneId, { collectionId }),

    update: changeScene,

    delete: async (actor, sceneId) => {
      assertCan(actor, "scene.edit");
      await store.transaction(async (tx) => {
        const row = await access.requireScene(
          actor,
          await store.scenes.getByIdAndWorkspaceIdForUpdate(sceneId, actor.workspaceId, tx),
          "edit",
          tx,
        );
        if (!mayDeleteScene(actor, row.createdBy)) throw new SceneDeleteDenied();
        await store.scenes.deleteByIdAndWorkspaceId(sceneId, actor.workspaceId, tx);
        await store.auditEvents.add(
          auditEvent({
            workspaceId: actor.workspaceId,
            action: "scene.deleted",
            actor: auditActorOf(actor),
            target: { kind: "scene", id: sceneId, label: row.title },
            at: now(),
          }),
          tx,
        );
      });
      accessChanged({ sceneId });
      await files.removeAllOf(actor.workspaceId, sceneId).catch((error: unknown) => {
        log(`Scene ${sceneId} was deleted, but its files were not all removed from storage: ${String(error)}`);
      });
    },

    save: async (actor, sceneId, changes) => {
      assertCan(actor, "scene.edit");
      return store.transaction(async (tx) => {
        const row = await access.requireScene(
          actor,
          await store.scenes.getByIdAndWorkspaceIdForNoKeyUpdate(sceneId, actor.workspaceId, tx),
          "edit",
          tx,
        );
        const { version } = await writeChanges(row, changes, actor.userId, tx);
        return { version };
      });
    },

    getShared: async (grant) => {
      const row = await store.scenes.getByIdAndWorkspaceId(grant.sceneId, grant.workspaceId);
      if (!row) throw new UnknownScene();
      return { title: row.title, version: row.version, access: grant.access, guestName: grant.by.name, ...openContent(sealer, row) };
    },

    read: async ({ workspaceId, sceneId }) => {
      const row = await store.scenes.getByIdAndWorkspaceId(sceneId, workspaceId);
      if (!row) throw new UnknownScene();
      return { version: row.version, ...openContent(sealer, row) };
    },

    persist: async ({ workspaceId, sceneId }, changes, updatedBy) =>
      store.transaction(async (tx) => {
        const row = await store.scenes.getByIdAndWorkspaceIdForNoKeyUpdate(sceneId, workspaceId, tx);
        if (!row) throw new UnknownScene();
        return writeChanges(row, changes, updatedBy, tx);
      }),

    resealNext: async (limit) => {
      const ids = await store.scenes.getAllIdsNotSealedWith(sealer.currentKeyId, limit);
      for (const { id } of ids) {
        await store.transaction(async (tx) => {
          const row = await store.scenes.getForUpdate(id, tx);
          if (!row || row.contentKeyId === sealer.currentKeyId) return;
          await store.scenes.update(id, sealContent(sealer, id, adoptContent(sealer, row)), tx);
        });
      }
      return ids.length;
    },
  };
}
