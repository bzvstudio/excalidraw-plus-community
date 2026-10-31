import { and, asc, eq, ne } from "drizzle-orm";
import { type CommentRow, comments, commentThreads, type NewCommentRow, userAvatars, users } from "@repo/db";
import type { Executor } from "./database.js";

export type CommentPatch = Partial<Pick<CommentRow, "body" | "bodyKeyId" | "editedAt">>;

export const commentsStore = {
  getAllWithUsersBySceneId: async (sceneId: string, db: Executor = global.db) =>
    db
      .select({ comment: comments, authorName: users.name, authorAvatarId: userAvatars.id })
      .from(comments)
      .innerJoin(commentThreads, eq(commentThreads.id, comments.threadId))
      .leftJoin(users, eq(users.id, comments.authorId))
      .leftJoin(userAvatars, eq(userAvatars.userId, comments.authorId))
      .where(eq(commentThreads.sceneId, sceneId))
      .orderBy(asc(comments.createdAt), asc(comments.id)),

  getWithThreadByIdAndSceneIdForUpdate: async (id: string, sceneId: string, db: Executor = global.db) => {
    const rows = await db
      .select({ comment: comments, thread: commentThreads })
      .from(comments)
      .innerJoin(commentThreads, eq(commentThreads.id, comments.threadId))
      .where(and(eq(comments.id, id), eq(commentThreads.sceneId, sceneId)))
      .limit(1)
      .for("update");

    return rows.at(0);
  },

  getByThreadId: async (threadId: string, db: Executor = global.db) => {
    const rows = await db.select({ id: comments.id }).from(comments).where(eq(comments.threadId, threadId)).limit(1);

    return rows.at(0);
  },

  getForUpdate: async (id: string, db: Executor = global.db) => {
    const rows = await db.select().from(comments).where(eq(comments.id, id)).limit(1).for("update");

    return rows.at(0);
  },

  getAllIdsNotSealedWith: async (keyId: string, limit: number, db: Executor = global.db) =>
    db.select({ id: comments.id }).from(comments).where(ne(comments.bodyKeyId, keyId)).orderBy(comments.id).limit(limit),

  add: async (row: NewCommentRow, db: Executor = global.db) => {
    const rows = await db.insert(comments).values(row).returning();

    return rows[0]!;
  },

  update: async (id: string, patch: CommentPatch, db: Executor = global.db) => {
    const rows = await db.update(comments).set(patch).where(eq(comments.id, id)).returning();

    return rows.at(0);
  },

  delete: async (id: string, db: Executor = global.db) => {
    await db.delete(comments).where(eq(comments.id, id));
  },
};
