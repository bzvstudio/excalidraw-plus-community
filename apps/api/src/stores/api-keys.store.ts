import { and, desc, eq, isNull, lt, or } from "drizzle-orm";
import { apiKeys, type NewApiKeyRow, users } from "@repo/db";
import type { Executor } from "./database.js";

const summary = {
  id: apiKeys.id,
  name: apiKeys.name,
  scope: apiKeys.scope,
  visiblePrefix: apiKeys.visiblePrefix,
  createdAt: apiKeys.createdAt,
  expiresAt: apiKeys.expiresAt,
  lastUsedAt: apiKeys.lastUsedAt,
  revokedAt: apiKeys.revokedAt,
};

export const apiKeysStore = {
  add: async (row: NewApiKeyRow, db: Executor = global.db) => {
    const rows = await db.insert(apiKeys).values(row).returning(summary);

    return rows[0]!;
  },

  getAllWithCreatorsByWorkspaceId: async (workspaceId: string, db: Executor = global.db) =>
    db
      .select({ ...summary, createdBy: apiKeys.createdBy, createdByName: users.name })
      .from(apiKeys)
      .leftJoin(users, eq(users.id, apiKeys.createdBy))
      .where(eq(apiKeys.workspaceId, workspaceId))
      .orderBy(desc(apiKeys.createdAt), desc(apiKeys.id)),

  getBySecretHash: async (secretHash: string, db: Executor = global.db) => {
    const rows = await db.select().from(apiKeys).where(eq(apiKeys.secretHash, secretHash)).limit(1);

    return rows.at(0);
  },

  getByIdAndWorkspaceId: async (id: string, workspaceId: string, db: Executor = global.db) => {
    const rows = await db.select(summary).from(apiKeys).where(and(eq(apiKeys.id, id), eq(apiKeys.workspaceId, workspaceId))).limit(1);

    return rows.at(0);
  },

  updateRevokedByIdAndWorkspaceIdIfActive: async (id: string, workspaceId: string, revokedAt: Date, db: Executor = global.db) => {
    const rows = await db
      .update(apiKeys)
      .set({ revokedAt })
      .where(and(eq(apiKeys.id, id), eq(apiKeys.workspaceId, workspaceId), isNull(apiKeys.revokedAt)))
      .returning({ id: apiKeys.id, name: apiKeys.name });

    return rows.at(0);
  },

  updateLastUsedIfBefore: async (id: string, usedAt: Date, before: Date, db: Executor = global.db) => {
    await db
      .update(apiKeys)
      .set({ lastUsedAt: usedAt })
      .where(and(eq(apiKeys.id, id), or(isNull(apiKeys.lastUsedAt), lt(apiKeys.lastUsedAt, before))));
  },
};
