import { and, asc, eq, gt, isNull, lt, or, sql } from "drizzle-orm";
import { type NewWorkspaceInviteRow, workspaceInvites, workspaces } from "@repo/db";
import type { Executor } from "./database.js";

export const workspaceInvitesStore = {
  getWithWorkspaceByTokenHash: async (tokenHash: string, db: Executor = global.db) => {
    const rows = await db
      .select({ invite: workspaceInvites, workspace: workspaces })
      .from(workspaceInvites)
      .innerJoin(workspaces, eq(workspaces.id, workspaceInvites.workspaceId))
      .where(eq(workspaceInvites.tokenHash, tokenHash))
      .limit(1);

    return rows.at(0);
  },

  getWithWorkspaceByTokenHashForUpdate: async (tokenHash: string, db: Executor = global.db) => {
    const rows = await db
      .select({ invite: workspaceInvites, workspace: workspaces })
      .from(workspaceInvites)
      .innerJoin(workspaces, eq(workspaces.id, workspaceInvites.workspaceId))
      .where(eq(workspaceInvites.tokenHash, tokenHash))
      .limit(1)
      .for("update", { of: workspaceInvites });

    return rows.at(0);
  },

  getByIdAndWorkspaceId: async (id: string, workspaceId: string, db: Executor = global.db) => {
    const rows = await db
      .select()
      .from(workspaceInvites)
      .where(and(eq(workspaceInvites.id, id), eq(workspaceInvites.workspaceId, workspaceId)))
      .limit(1);

    return rows.at(0);
  },

  getAllActiveByWorkspaceId: async (workspaceId: string, now: Date, db: Executor = global.db) =>
    db
      .select()
      .from(workspaceInvites)
      .where(
        and(
          eq(workspaceInvites.workspaceId, workspaceId),
          isNull(workspaceInvites.revokedAt),
          or(isNull(workspaceInvites.maxUses), lt(workspaceInvites.useCount, workspaceInvites.maxUses)),
          gt(workspaceInvites.expiresAt, now),
        ),
      )
      .orderBy(asc(workspaceInvites.createdAt)),

  add: async (row: NewWorkspaceInviteRow, db: Executor = global.db) => {
    const rows = await db.insert(workspaceInvites).values(row).returning();

    return rows[0]!;
  },

  incrementUsesById: async (id: string, db: Executor = global.db) => {
    const rows = await db
      .update(workspaceInvites)
      .set({ useCount: sql`${workspaceInvites.useCount} + 1` })
      .where(eq(workspaceInvites.id, id))
      .returning();

    return rows.at(0);
  },

  updateRevokedByIdAndWorkspaceIdIfActive: async (
    id: string,
    workspaceId: string,
    revokedAt: Date,
    db: Executor = global.db,
  ) => {
    const rows = await db
      .update(workspaceInvites)
      .set({ revokedAt })
      .where(
        and(
          eq(workspaceInvites.id, id),
          eq(workspaceInvites.workspaceId, workspaceId),
          isNull(workspaceInvites.revokedAt),
          or(isNull(workspaceInvites.maxUses), lt(workspaceInvites.useCount, workspaceInvites.maxUses)),
        ),
      )
      .returning();

    return rows.at(0);
  },
};
