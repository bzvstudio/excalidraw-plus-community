import { and, asc, eq } from "drizzle-orm";
import { type NewWorkspaceRemovalRow, users, workspaceRemovals } from "@repo/db";
import type { Executor } from "./database.js";

function isRemoval(workspaceId: string, userId: string) {
  return and(eq(workspaceRemovals.workspaceId, workspaceId), eq(workspaceRemovals.userId, userId));
}

export const workspaceRemovalsStore = {
  get: async (workspaceId: string, userId: string, db: Executor = global.db) => {
    const rows = await db
      .select()
      .from(workspaceRemovals)
      .where(isRemoval(workspaceId, userId))
      .limit(1);

    return rows.at(0);
  },

  getAllWithUsersByWorkspaceId: async (workspaceId: string, db: Executor = global.db) =>
    db
      .select({
        userId: workspaceRemovals.userId,
        removedAt: workspaceRemovals.removedAt,
        name: users.name,
        email: users.email,
      })
      .from(workspaceRemovals)
      .innerJoin(users, eq(users.id, workspaceRemovals.userId))
      .where(eq(workspaceRemovals.workspaceId, workspaceId))
      .orderBy(asc(users.name), asc(users.email)),

  upsert: async (row: NewWorkspaceRemovalRow, db: Executor = global.db) => {
    await db
      .insert(workspaceRemovals)
      .values(row)
      .onConflictDoUpdate({
        target: [workspaceRemovals.workspaceId, workspaceRemovals.userId],
        set: { removedAt: row.removedAt },
      });
  },

  delete: async (workspaceId: string, userId: string, db: Executor = global.db) => {
    const rows = await db
      .delete(workspaceRemovals)
      .where(isRemoval(workspaceId, userId))
      .returning({ userId: workspaceRemovals.userId });

    return rows.at(0);
  },
};
