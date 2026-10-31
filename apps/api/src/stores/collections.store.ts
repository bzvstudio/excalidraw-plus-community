import { and, asc, eq } from "drizzle-orm";
import { type CollectionRow, collections, type NewCollectionRow } from "@repo/db";
import { type CollectionViewer, collectionOpenTo } from "./collection-teams.store.js";
import type { Executor } from "./database.js";

export type CollectionPatch = Partial<Pick<CollectionRow, "name">>;

function inWorkspace(id: string, workspaceId: string) {
  return and(eq(collections.id, id), eq(collections.workspaceId, workspaceId));
}

export const collectionsStore = {
  getAllByWorkspaceIdVisibleTo: async (workspaceId: string, viewer: CollectionViewer, db: Executor = global.db) =>
    db
      .select()
      .from(collections)
      .where(
        and(
          eq(collections.workspaceId, workspaceId),
          viewer.seesEverything ? undefined : collectionOpenTo(collections.id, viewer, db),
        ),
      )
      .orderBy(asc(collections.name)),

  getByIdAndWorkspaceIdForKeyShare: async (id: string, workspaceId: string, db: Executor = global.db) => {
    const rows = await db.select().from(collections).where(inWorkspace(id, workspaceId)).limit(1).for("key share");

    return rows.at(0);
  },

  getByIdAndWorkspaceIdForUpdate: async (id: string, workspaceId: string, db: Executor = global.db) => {
    const rows = await db.select().from(collections).where(inWorkspace(id, workspaceId)).limit(1).for("update");

    return rows.at(0);
  },

  add: async (row: NewCollectionRow, db: Executor = global.db) => {
    const rows = await db.insert(collections).values(row).returning();

    return rows[0]!;
  },

  updateByIdAndWorkspaceId: async (id: string, workspaceId: string, patch: CollectionPatch, db: Executor = global.db) => {
    const rows = await db.update(collections).set(patch).where(inWorkspace(id, workspaceId)).returning();

    return rows.at(0);
  },

  deleteByIdAndWorkspaceId: async (id: string, workspaceId: string, db: Executor = global.db) => {
    await db.delete(collections).where(inWorkspace(id, workspaceId));
  },
};
