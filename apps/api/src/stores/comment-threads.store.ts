import { and, asc, eq, inArray } from "drizzle-orm";
import { type CommentThreadRow, commentThreads, type NewCommentThreadRow } from "@repo/db";
import type { Executor } from "./database.js";

export type CommentThreadPatch = Partial<
  Pick<CommentThreadRow, "resolvedAt" | "x" | "y" | "elementId" | "offsetX" | "offsetY">
>;

export const commentThreadsStore = {
  getAllBySceneId: async (sceneId: string, db: Executor = global.db) =>
    db
      .select()
      .from(commentThreads)
      .where(eq(commentThreads.sceneId, sceneId))
      .orderBy(asc(commentThreads.createdAt), asc(commentThreads.id)),

  getAllBySceneIdAndElementIds: async (sceneId: string, elementIds: readonly string[], db: Executor = global.db) =>
    db
      .select()
      .from(commentThreads)
      .where(and(eq(commentThreads.sceneId, sceneId), inArray(commentThreads.elementId, [...elementIds]))),

  getByIdAndSceneIdForUpdate: async (id: string, sceneId: string, db: Executor = global.db) => {
    const rows = await db
      .select()
      .from(commentThreads)
      .where(and(eq(commentThreads.id, id), eq(commentThreads.sceneId, sceneId)))
      .limit(1)
      .for("update");

    return rows.at(0);
  },

  add: async (row: NewCommentThreadRow, db: Executor = global.db) => {
    const rows = await db.insert(commentThreads).values(row).returning();

    return rows[0]!;
  },

  updateByIdAndSceneId: async (id: string, sceneId: string, patch: CommentThreadPatch, db: Executor = global.db) => {
    const rows = await db
      .update(commentThreads)
      .set(patch)
      .where(and(eq(commentThreads.id, id), eq(commentThreads.sceneId, sceneId)))
      .returning();

    return rows.at(0);
  },

  delete: async (id: string, db: Executor = global.db) => {
    await db.delete(commentThreads).where(eq(commentThreads.id, id));
  },
};
