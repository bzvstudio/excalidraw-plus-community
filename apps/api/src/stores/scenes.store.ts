import { and, desc, eq, ilike, isNotNull, isNull, or, sql } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { type NewSceneRow, type SceneRow, sceneThumbnails, scenes, userAvatars, users } from "@repo/db";
import { type CollectionViewer, collectionOpenTo } from "./collection-teams.store.js";
import type { Executor } from "./database.js";

export type ScenePatch = Partial<
  Pick<SceneRow, "title" | "collectionId" | "content" | "contentKeyId" | "version" | "updatedBy" | "updatedAt">
>;


const creators = alias(users, "creators");

export type SceneListFilter = { collectionId?: string | null; titleContains?: string; limit?: number };

const summaryColumns = {
  id: scenes.id,
  workspaceId: scenes.workspaceId,
  collectionId: scenes.collectionId,
  title: scenes.title,
  version: scenes.version,
  createdBy: scenes.createdBy,
  updatedBy: scenes.updatedBy,
  createdAt: scenes.createdAt,
  updatedAt: scenes.updatedAt,
};

function inWorkspace(id: string, workspaceId: string) {
  return and(eq(scenes.id, id), eq(scenes.workspaceId, workspaceId));
}

function visibleTo(viewer: CollectionViewer, db: Executor) {
  if (viewer.seesEverything) return undefined;
  return or(
    and(isNull(scenes.collectionId), eq(scenes.createdBy, viewer.userId)),
    and(isNotNull(scenes.collectionId), collectionOpenTo(scenes.collectionId, viewer, db)),
  );
}

function inCollection(collectionId: string | null | undefined) {
  if (collectionId === undefined) return undefined;
  return collectionId === null ? isNull(scenes.collectionId) : eq(scenes.collectionId, collectionId);
}

function titleContains(text: string | undefined) {
  return text ? ilike(scenes.title, `%${text.replace(/[\\%_]/g, (char) => `\\${char}`)}%`) : undefined;
}

export const scenesStore = {
  getForUpdate: async (id: string, db: Executor = global.db) => {
    const rows = await db.select().from(scenes).where(eq(scenes.id, id)).limit(1).for("update");

    return rows.at(0);
  },

  getForKeyShare: async (id: string, db: Executor = global.db) => {
    const rows = await db.select(summaryColumns).from(scenes).where(eq(scenes.id, id)).limit(1).for("key share");

    return rows.at(0);
  },

  getAllIdsNotSealedWith: async (keyId: string, limit: number, db: Executor = global.db) =>
    db
      .select({ id: scenes.id })
      .from(scenes)
      .where(sql`${scenes.contentKeyId} is distinct from ${keyId}`)
      .orderBy(scenes.id)
      .limit(limit),

  update: async (id: string, patch: ScenePatch, db: Executor = global.db) => {
    const rows = await db.update(scenes).set(patch).where(eq(scenes.id, id)).returning({ id: scenes.id });

    return rows.at(0);
  },

  getByIdAndWorkspaceId: async (id: string, workspaceId: string, db: Executor = global.db) => {
    const rows = await db.select().from(scenes).where(inWorkspace(id, workspaceId)).limit(1);

    return rows.at(0);
  },

  getSummaryById: async (id: string, db: Executor = global.db) => {
    const rows = await db.select(summaryColumns).from(scenes).where(eq(scenes.id, id)).limit(1);

    return rows.at(0);
  },

  getSummaryByIdAndWorkspaceId: async (id: string, workspaceId: string, db: Executor = global.db) => {
    const rows = await db.select(summaryColumns).from(scenes).where(inWorkspace(id, workspaceId)).limit(1);

    return rows.at(0);
  },

  getByIdAndWorkspaceIdForKeyShare: async (id: string, workspaceId: string, db: Executor = global.db) => {
    const rows = await db
      .select(summaryColumns)
      .from(scenes)
      .where(inWorkspace(id, workspaceId))
      .limit(1)
      .for("key share");

    return rows.at(0);
  },

  getByIdAndWorkspaceIdForNoKeyUpdate: async (id: string, workspaceId: string, db: Executor = global.db) => {
    const rows = await db.select().from(scenes).where(inWorkspace(id, workspaceId)).limit(1).for("no key update");

    return rows.at(0);
  },

  getByIdAndWorkspaceIdForUpdate: async (id: string, workspaceId: string, db: Executor = global.db) => {
    const rows = await db.select().from(scenes).where(inWorkspace(id, workspaceId)).limit(1).for("update");

    return rows.at(0);
  },

  getAllWithUsersAndSceneThumbnailsByWorkspaceIdVisibleTo: async (
    workspaceId: string,
    viewer: CollectionViewer,
    filter: SceneListFilter,
    db: Executor = global.db,
  ) => {
    const query = db
      .select({
        ...summaryColumns,
        createdByName: creators.name,
        updatedByName: users.name,
        updatedByAvatarId: userAvatars.id,
        thumbnailUpdatedAt: sceneThumbnails.updatedAt,
      })
      .from(scenes)
      .leftJoin(users, eq(users.id, scenes.updatedBy))
      .leftJoin(userAvatars, eq(userAvatars.userId, scenes.updatedBy))
      .leftJoin(creators, eq(creators.id, scenes.createdBy))
      .leftJoin(sceneThumbnails, eq(sceneThumbnails.sceneId, scenes.id))
      .where(
        and(
          eq(scenes.workspaceId, workspaceId),
          visibleTo(viewer, db),
          inCollection(filter.collectionId),
          titleContains(filter.titleContains),
        ),
      )
      .orderBy(desc(scenes.updatedAt))
      .$dynamic();

    return filter.limit ? query.limit(filter.limit) : query;
  },

  getByCollectionId: async (collectionId: string, db: Executor = global.db) => {
    const rows = await db.select({ id: scenes.id }).from(scenes).where(eq(scenes.collectionId, collectionId)).limit(1);

    return rows.at(0);
  },

  add: async (row: NewSceneRow, db: Executor = global.db) => {
    const rows = await db.insert(scenes).values(row).returning({ id: scenes.id });

    return rows[0]!;
  },

  updateByIdAndWorkspaceId: async (id: string, workspaceId: string, patch: ScenePatch, db: Executor = global.db) => {
    const rows = await db.update(scenes).set(patch).where(inWorkspace(id, workspaceId)).returning(summaryColumns);

    return rows.at(0);
  },

  deleteByIdAndWorkspaceId: async (id: string, workspaceId: string, db: Executor = global.db) => {
    await db.delete(scenes).where(inWorkspace(id, workspaceId));
  },
};
