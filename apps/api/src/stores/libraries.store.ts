import { and, eq, ne } from "drizzle-orm";
import { libraries, type LibraryRow, type NewLibraryRow } from "@repo/db";
import type { Executor } from "./database.js";

export type LibraryPatch = Partial<Pick<LibraryRow, "items" | "contentKeyId" | "version" | "updatedAt">>;

export const librariesStore = {
  get: async (userId: string, db: Executor = global.db) => {
    const rows = await db.select().from(libraries).where(eq(libraries.userId, userId)).limit(1);

    return rows.at(0);
  },

  getForUpdate: async (userId: string, db: Executor = global.db) => {
    const rows = await db.select().from(libraries).where(eq(libraries.userId, userId)).limit(1).for("update");

    return rows.at(0);
  },

  getAllUserIdsNotSealedWith: async (keyId: string, limit: number, db: Executor = global.db) =>
    db
      .select({ userId: libraries.userId })
      .from(libraries)
      .where(ne(libraries.contentKeyId, keyId))
      .orderBy(libraries.userId)
      .limit(limit),

  addIfAbsent: async (row: NewLibraryRow, db: Executor = global.db) => {
    const rows = await db
      .insert(libraries)
      .values(row)
      .onConflictDoNothing()
      .returning({ version: libraries.version });

    return rows.at(0);
  },

  updateByUserIdAndVersion: async (userId: string, version: number, patch: LibraryPatch, db: Executor = global.db) => {
    const rows = await db
      .update(libraries)
      .set(patch)
      .where(and(eq(libraries.userId, userId), eq(libraries.version, version)))
      .returning();

    return rows.at(0);
  },

  update: async (userId: string, patch: LibraryPatch, db: Executor = global.db) => {
    const rows = await db.update(libraries).set(patch).where(eq(libraries.userId, userId)).returning();

    return rows.at(0);
  },
};
