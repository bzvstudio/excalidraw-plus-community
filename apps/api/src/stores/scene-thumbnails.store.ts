import { eq, getTableColumns, ne, sql } from "drizzle-orm";
import { type NewSceneThumbnailRow, type SceneThumbnailRow, sceneThumbnails } from "@repo/db";
import type { Executor } from "./database.js";

export type SceneThumbnailPatch = Partial<Pick<SceneThumbnailRow, "image" | "contentKeyId">>;

export const sceneThumbnailsStore = {
  get: async (sceneId: string, db: Executor = global.db) => {
    const rows = await db.select().from(sceneThumbnails).where(eq(sceneThumbnails.sceneId, sceneId)).limit(1);

    return rows.at(0);
  },

  getForUpdate: async (sceneId: string, db: Executor = global.db) => {
    const rows = await db
      .select()
      .from(sceneThumbnails)
      .where(eq(sceneThumbnails.sceneId, sceneId))
      .limit(1)
      .for("update");

    return rows.at(0);
  },

  getAllSceneIdsNotSealedWith: async (keyId: string, limit: number, db: Executor = global.db) =>
    db
      .select({ sceneId: sceneThumbnails.sceneId })
      .from(sceneThumbnails)
      .where(ne(sceneThumbnails.contentKeyId, keyId))
      .orderBy(sceneThumbnails.sceneId)
      .limit(limit),

  upsert: async (row: NewSceneThumbnailRow, db: Executor = global.db) => {
    const rows = await db
      .insert(sceneThumbnails)
      .values(row)
      .onConflictDoUpdate({
        target: sceneThumbnails.sceneId,
        set: { image: row.image, contentKeyId: row.contentKeyId, updatedAt: row.updatedAt },
      })
      .returning({ ...getTableColumns(sceneThumbnails), inserted: sql<boolean>`xmax = 0` });

    return rows[0]!;
  },

  update: async (sceneId: string, patch: SceneThumbnailPatch, db: Executor = global.db) => {
    const rows = await db.update(sceneThumbnails).set(patch).where(eq(sceneThumbnails.sceneId, sceneId)).returning();

    return rows.at(0);
  },
};
