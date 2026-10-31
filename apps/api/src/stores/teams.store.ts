import { and, asc, eq, inArray } from "drizzle-orm";
import { type NewTeamRow, type TeamRow, teams } from "@repo/db";
import type { Executor } from "./database.js";

export type TeamPatch = Partial<Pick<TeamRow, "name">>;

function inWorkspace(id: string, workspaceId: string) {
  return and(eq(teams.id, id), eq(teams.workspaceId, workspaceId));
}

export const teamsStore = {
  getAllByWorkspaceId: async (workspaceId: string, db: Executor = global.db) =>
    db.select().from(teams).where(eq(teams.workspaceId, workspaceId)).orderBy(asc(teams.name)),

  getAllByIdsAndWorkspaceIdForKeyShare: async (ids: string[], workspaceId: string, db: Executor = global.db) =>
    db
      .select()
      .from(teams)
      .where(and(inArray(teams.id, ids), eq(teams.workspaceId, workspaceId)))
      .for("key share"),

  getByIdAndWorkspaceId: async (id: string, workspaceId: string, db: Executor = global.db) => {
    const rows = await db.select().from(teams).where(inWorkspace(id, workspaceId)).limit(1);

    return rows.at(0);
  },

  getByIdAndWorkspaceIdForUpdate: async (id: string, workspaceId: string, db: Executor = global.db) => {
    const rows = await db.select().from(teams).where(inWorkspace(id, workspaceId)).limit(1).for("update");

    return rows.at(0);
  },

  add: async (row: NewTeamRow, db: Executor = global.db) => {
    const rows = await db.insert(teams).values(row).returning();

    return rows[0]!;
  },

  updateByIdAndWorkspaceId: async (id: string, workspaceId: string, patch: TeamPatch, db: Executor = global.db) => {
    const rows = await db.update(teams).set(patch).where(inWorkspace(id, workspaceId)).returning();

    return rows.at(0);
  },

  deleteByIdAndWorkspaceId: async (id: string, workspaceId: string, db: Executor = global.db) => {
    await db.delete(teams).where(inWorkspace(id, workspaceId));
  },
};
