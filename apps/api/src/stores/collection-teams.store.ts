import { and, type Column, eq, exists, inArray, notExists, or, sql } from "drizzle-orm";
import { type CollectionTeamRow, collections, collectionTeams } from "@repo/db";
import type { Executor } from "./database.js";

export type CollectionViewer = { userId: string; seesEverything: boolean; teamIds: string[] };

export function collectionOpenTo(collectionId: Column, viewer: CollectionViewer, db: Executor) {
  const restrictions = db
    .select({ one: sql`1` })
    .from(collectionTeams)
    .where(eq(collectionTeams.collectionId, collectionId));
  if (viewer.teamIds.length === 0) return notExists(restrictions);
  const mine = db
    .select({ one: sql`1` })
    .from(collectionTeams)
    .where(and(eq(collectionTeams.collectionId, collectionId), inArray(collectionTeams.teamId, viewer.teamIds)));
  return or(notExists(restrictions), exists(mine));
}

export const collectionTeamsStore = {
  getAllByWorkspaceId: async (workspaceId: string, db: Executor = global.db) =>
    db
      .select({ collectionId: collectionTeams.collectionId, teamId: collectionTeams.teamId })
      .from(collectionTeams)
      .innerJoin(collections, eq(collections.id, collectionTeams.collectionId))
      .where(eq(collections.workspaceId, workspaceId)),

  getAllTeamIdsByCollectionId: async (collectionId: string, db: Executor = global.db) =>
    db.select({ teamId: collectionTeams.teamId }).from(collectionTeams).where(eq(collectionTeams.collectionId, collectionId)),

  getByTeamId: async (teamId: string, db: Executor = global.db) => {
    const rows = await db.select().from(collectionTeams).where(eq(collectionTeams.teamId, teamId)).limit(1);

    return rows.at(0);
  },

  add: async (rows: CollectionTeamRow[], db: Executor = global.db) => {
    await db.insert(collectionTeams).values(rows);
  },

  deleteByCollectionId: async (collectionId: string, db: Executor = global.db) => {
    await db.delete(collectionTeams).where(eq(collectionTeams.collectionId, collectionId));
  },
};
