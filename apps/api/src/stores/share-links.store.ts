import { and, asc, eq, gt, isNull, or } from "drizzle-orm";
import { type NewShareLinkRow, scenes, shareLinks, workspaces } from "@repo/db";
import type { Executor } from "./database.js";

function withSceneAndWorkspace(db: Executor) {
  return db
    .select({
      link: shareLinks,
      scene: {
        id: scenes.id,
        workspaceId: scenes.workspaceId,
        collectionId: scenes.collectionId,
        createdBy: scenes.createdBy,
      },
      workspace: { slug: workspaces.slug, guestEditLinks: workspaces.guestEditLinks },
    })
    .from(shareLinks)
    .innerJoin(scenes, eq(scenes.id, shareLinks.sceneId))
    .innerJoin(workspaces, eq(workspaces.id, scenes.workspaceId));
}

export const shareLinksStore = {
  getWithSceneAndWorkspaceById: async (id: string, db: Executor = global.db) => {
    const rows = await withSceneAndWorkspace(db).where(eq(shareLinks.id, id)).limit(1);

    return rows.at(0);
  },

  getWithSceneAndWorkspaceByTokenHash: async (tokenHash: string, db: Executor = global.db) => {
    const rows = await withSceneAndWorkspace(db).where(eq(shareLinks.tokenHash, tokenHash)).limit(1);

    return rows.at(0);
  },

  getAllActiveBySceneId: async (sceneId: string, now: Date, db: Executor = global.db) =>
    db
      .select()
      .from(shareLinks)
      .where(
        and(
          eq(shareLinks.sceneId, sceneId),
          isNull(shareLinks.revokedAt),
          or(isNull(shareLinks.expiresAt), gt(shareLinks.expiresAt, now)),
        ),
      )
      .orderBy(asc(shareLinks.createdAt)),

  add: async (row: NewShareLinkRow, db: Executor = global.db) => {
    const rows = await db.insert(shareLinks).values(row).returning();

    return rows[0]!;
  },

  updateRevokedByIdAndSceneIdIfActive: async (id: string, sceneId: string, revokedAt: Date, db: Executor = global.db) => {
    const rows = await db
      .update(shareLinks)
      .set({ revokedAt })
      .where(and(eq(shareLinks.id, id), eq(shareLinks.sceneId, sceneId), isNull(shareLinks.revokedAt)))
      .returning();

    return rows.at(0);
  },
};
