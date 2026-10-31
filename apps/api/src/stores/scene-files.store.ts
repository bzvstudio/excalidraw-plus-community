import { and, asc, eq, ne } from "drizzle-orm";
import { type NewSceneFileRow, type SceneFileRow, sceneFiles } from "@repo/db";
import type { Executor } from "./database.js";

export type SceneFilePatch = Partial<Pick<SceneFileRow, "contentKeyId">>;

function byIds(sceneId: string, fileId: string) {
  return and(eq(sceneFiles.sceneId, sceneId), eq(sceneFiles.fileId, fileId));
}

export const sceneFilesStore = {
  get: async (sceneId: string, fileId: string, db: Executor = global.db) => {
    const rows = await db.select().from(sceneFiles).where(byIds(sceneId, fileId)).limit(1);

    return rows.at(0);
  },

  getForUpdate: async (sceneId: string, fileId: string, db: Executor = global.db) => {
    const rows = await db.select().from(sceneFiles).where(byIds(sceneId, fileId)).limit(1).for("update");

    return rows.at(0);
  },

  getAllNotSealedWith: async (keyId: string, limit: number, db: Executor = global.db) =>
    db
      .select({ sceneId: sceneFiles.sceneId, fileId: sceneFiles.fileId })
      .from(sceneFiles)
      .where(ne(sceneFiles.contentKeyId, keyId))
      .orderBy(asc(sceneFiles.sceneId), asc(sceneFiles.fileId))
      .limit(limit),

  addIfAbsent: async (row: NewSceneFileRow, db: Executor = global.db) => {
    const rows = await db
      .insert(sceneFiles)
      .values(row)
      .onConflictDoNothing()
      .returning({ fileId: sceneFiles.fileId });

    return rows.at(0);
  },

  update: async (sceneId: string, fileId: string, patch: SceneFilePatch, db: Executor = global.db) => {
    const rows = await db.update(sceneFiles).set(patch).where(byIds(sceneId, fileId)).returning();

    return rows.at(0);
  },
};
