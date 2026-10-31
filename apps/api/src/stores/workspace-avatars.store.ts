import { and, eq, exists, ne } from "drizzle-orm";
import { type NewWorkspaceAvatarRow, type WorkspaceAvatarRow, workspaceAvatars, workspaceMembers } from "@repo/db";
import type { Executor } from "./database.js";

export type WorkspaceAvatarPatch = Partial<Pick<WorkspaceAvatarRow, "image" | "contentKeyId">>;

export const workspaceAvatarsStore = {
  getIdByWorkspaceId: async (workspaceId: string, db: Executor = global.db) => {
    const rows = await db
      .select({ id: workspaceAvatars.id })
      .from(workspaceAvatars)
      .where(eq(workspaceAvatars.workspaceId, workspaceId))
      .limit(1);

    return rows.at(0)?.id ?? null;
  },

  getByIdVisibleTo: async (viewerId: string, id: string, db: Executor = global.db) => {
    const rows = await db
      .select()
      .from(workspaceAvatars)
      .where(
        and(
          eq(workspaceAvatars.id, id),
          exists(
            db
              .select({ userId: workspaceMembers.userId })
              .from(workspaceMembers)
              .where(and(eq(workspaceMembers.workspaceId, workspaceAvatars.workspaceId), eq(workspaceMembers.userId, viewerId))),
          ),
        ),
      )
      .limit(1);

    return rows.at(0);
  },

  getForUpdate: async (workspaceId: string, db: Executor = global.db) => {
    const rows = await db
      .select()
      .from(workspaceAvatars)
      .where(eq(workspaceAvatars.workspaceId, workspaceId))
      .limit(1)
      .for("update");

    return rows.at(0);
  },

  getAllWorkspaceIdsNotSealedWith: async (keyId: string, limit: number, db: Executor = global.db) =>
    db
      .select({ workspaceId: workspaceAvatars.workspaceId })
      .from(workspaceAvatars)
      .where(ne(workspaceAvatars.contentKeyId, keyId))
      .orderBy(workspaceAvatars.workspaceId)
      .limit(limit),

  upsert: async (row: NewWorkspaceAvatarRow, db: Executor = global.db) => {
    const rows = await db
      .insert(workspaceAvatars)
      .values(row)
      .onConflictDoUpdate({
        target: workspaceAvatars.workspaceId,
        set: { id: row.id, image: row.image, contentKeyId: row.contentKeyId, updatedAt: row.updatedAt },
      })
      .returning();

    return rows[0]!;
  },

  update: async (workspaceId: string, patch: WorkspaceAvatarPatch, db: Executor = global.db) => {
    const rows = await db.update(workspaceAvatars).set(patch).where(eq(workspaceAvatars.workspaceId, workspaceId)).returning();

    return rows.at(0);
  },

  delete: async (workspaceId: string, db: Executor = global.db) => {
    const rows = await db
      .delete(workspaceAvatars)
      .where(eq(workspaceAvatars.workspaceId, workspaceId))
      .returning({ workspaceId: workspaceAvatars.workspaceId });

    return rows.length > 0;
  },
};
