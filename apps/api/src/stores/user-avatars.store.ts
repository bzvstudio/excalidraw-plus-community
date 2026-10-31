import { and, eq, exists, ne, or } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { type NewUserAvatarRow, type UserAvatarRow, userAvatars, workspaceMembers } from "@repo/db";
import type { Executor } from "./database.js";

export type UserAvatarPatch = Partial<Pick<UserAvatarRow, "image" | "contentKeyId">>;

const viewerMembers = alias(workspaceMembers, "viewer_members");

export const userAvatarsStore = {
  getIdByUserId: async (userId: string, db: Executor = global.db) => {
    const rows = await db.select({ id: userAvatars.id }).from(userAvatars).where(eq(userAvatars.userId, userId)).limit(1);

    return rows.at(0)?.id ?? null;
  },

  getByIdVisibleTo: async (viewerId: string, id: string, db: Executor = global.db) => {
    const rows = await db
      .select()
      .from(userAvatars)
      .where(
        and(
          eq(userAvatars.id, id),
          or(
            eq(userAvatars.userId, viewerId),
            exists(
              db
                .select({ workspaceId: workspaceMembers.workspaceId })
                .from(workspaceMembers)
                .innerJoin(
                  viewerMembers,
                  and(eq(viewerMembers.workspaceId, workspaceMembers.workspaceId), eq(viewerMembers.userId, viewerId)),
                )
                .where(eq(workspaceMembers.userId, userAvatars.userId)),
            ),
          ),
        ),
      )
      .limit(1);

    return rows.at(0);
  },

  getForUpdate: async (userId: string, db: Executor = global.db) => {
    const rows = await db.select().from(userAvatars).where(eq(userAvatars.userId, userId)).limit(1).for("update");

    return rows.at(0);
  },

  getAllUserIdsNotSealedWith: async (keyId: string, limit: number, db: Executor = global.db) =>
    db
      .select({ userId: userAvatars.userId })
      .from(userAvatars)
      .where(ne(userAvatars.contentKeyId, keyId))
      .orderBy(userAvatars.userId)
      .limit(limit),

  upsert: async (row: NewUserAvatarRow, db: Executor = global.db) => {
    const rows = await db
      .insert(userAvatars)
      .values(row)
      .onConflictDoUpdate({
        target: userAvatars.userId,
        set: { id: row.id, image: row.image, contentKeyId: row.contentKeyId, updatedAt: row.updatedAt },
      })
      .returning();

    return rows[0]!;
  },

  update: async (userId: string, patch: UserAvatarPatch, db: Executor = global.db) => {
    const rows = await db.update(userAvatars).set(patch).where(eq(userAvatars.userId, userId)).returning();

    return rows.at(0);
  },

  delete: async (userId: string, db: Executor = global.db) => {
    const rows = await db.delete(userAvatars).where(eq(userAvatars.userId, userId)).returning({ userId: userAvatars.userId });

    return rows.length > 0;
  },
};
