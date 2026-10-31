import { and, eq, inArray } from "drizzle-orm";
import { type TeamMemberRow, teamMembers, teams } from "@repo/db";
import type { Executor } from "./database.js";

function teamsOf(workspaceId: string, db: Executor) {
  return db.select({ id: teams.id }).from(teams).where(eq(teams.workspaceId, workspaceId));
}

export const teamMembersStore = {
  getAllByWorkspaceId: async (workspaceId: string, db: Executor = global.db) =>
    db
      .select({ teamId: teamMembers.teamId, userId: teamMembers.userId })
      .from(teamMembers)
      .innerJoin(teams, eq(teams.id, teamMembers.teamId))
      .where(eq(teams.workspaceId, workspaceId)),

  getAllTeamIdsByUserIdAndWorkspaceId: async (userId: string, workspaceId: string, db: Executor = global.db) =>
    db
      .select({ teamId: teamMembers.teamId })
      .from(teamMembers)
      .where(and(eq(teamMembers.userId, userId), inArray(teamMembers.teamId, teamsOf(workspaceId, db)))),

  addIfAbsent: async (row: TeamMemberRow, db: Executor = global.db) => {
    const rows = await db.insert(teamMembers).values(row).onConflictDoNothing().returning({ userId: teamMembers.userId });

    return rows.at(0);
  },

  delete: async (teamId: string, userId: string, db: Executor = global.db) => {
    const rows = await db
      .delete(teamMembers)
      .where(and(eq(teamMembers.teamId, teamId), eq(teamMembers.userId, userId)))
      .returning({ userId: teamMembers.userId });

    return rows.at(0);
  },

  deleteByUserIdAndWorkspaceId: async (userId: string, workspaceId: string, db: Executor = global.db) => {
    await db
      .delete(teamMembers)
      .where(and(eq(teamMembers.userId, userId), inArray(teamMembers.teamId, teamsOf(workspaceId, db))));
  },
};
