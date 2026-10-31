import { eq, ne } from "drizzle-orm";
import { workspaceAiKeys, type NewWorkspaceAiKeyRow, type WorkspaceAiKeyRow } from "@repo/db";
import type { Executor } from "./database.js";

export type WorkspaceAiKeyPatch = Partial<Pick<WorkspaceAiKeyRow, "apiKey" | "apiKeyKeyId">>;

export const workspaceAiKeysStore = {
  get: async (workspaceId: string, db: Executor = global.db) => {
    const rows = await db.select().from(workspaceAiKeys).where(eq(workspaceAiKeys.workspaceId, workspaceId)).limit(1);

    return rows.at(0);
  },

  getForUpdate: async (workspaceId: string, db: Executor = global.db) => {
    const rows = await db
      .select()
      .from(workspaceAiKeys)
      .where(eq(workspaceAiKeys.workspaceId, workspaceId))
      .limit(1)
      .for("update");

    return rows.at(0);
  },

  getAllWorkspaceIdsNotSealedWith: async (keyId: string, limit: number, db: Executor = global.db) =>
    db
      .select({ workspaceId: workspaceAiKeys.workspaceId })
      .from(workspaceAiKeys)
      .where(ne(workspaceAiKeys.apiKeyKeyId, keyId))
      .orderBy(workspaceAiKeys.workspaceId)
      .limit(limit),

  upsert: async (row: NewWorkspaceAiKeyRow, db: Executor = global.db) => {
    const rows = await db
      .insert(workspaceAiKeys)
      .values(row)
      .onConflictDoUpdate({
        target: workspaceAiKeys.workspaceId,
        set: {
          provider: row.provider,
          model: row.model,
          visionModel: row.visionModel ?? null,
          apiKey: row.apiKey,
          apiKeyKeyId: row.apiKeyKeyId,
          lastFour: row.lastFour,
          updatedAt: row.updatedAt,
        },
      })
      .returning();

    return rows[0]!;
  },

  update: async (workspaceId: string, patch: WorkspaceAiKeyPatch, db: Executor = global.db) => {
    const rows = await db.update(workspaceAiKeys).set(patch).where(eq(workspaceAiKeys.workspaceId, workspaceId)).returning();

    return rows.at(0);
  },

  delete: async (workspaceId: string, db: Executor = global.db) => {
    const rows = await db
      .delete(workspaceAiKeys)
      .where(eq(workspaceAiKeys.workspaceId, workspaceId))
      .returning({ workspaceId: workspaceAiKeys.workspaceId });

    return rows.at(0);
  },
};
