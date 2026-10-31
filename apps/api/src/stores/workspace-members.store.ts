import { and, asc, count, eq, inArray } from "drizzle-orm";
import {
  type NewWorkspaceMemberRow,
  userAvatars,
  users,
  type WorkspaceMemberRow,
  workspaceAvatars,
  workspaceMembers,
  workspaces,
} from "@repo/db";
import type { Executor } from "./database.js";

export type WorkspaceMemberPatch = Partial<Pick<WorkspaceMemberRow, "role">>;

function isMember(workspaceId: string, userId: string) {
  return and(eq(workspaceMembers.workspaceId, workspaceId), eq(workspaceMembers.userId, userId));
}

export const workspaceMembersStore = {
  get: async (workspaceId: string, userId: string, db: Executor = global.db) => {
    const rows = await db
      .select()
      .from(workspaceMembers)
      .where(isMember(workspaceId, userId))
      .limit(1);

    return rows.at(0);
  },

  getForUpdate: async (workspaceId: string, userId: string, db: Executor = global.db) => {
    const rows = await db
      .select()
      .from(workspaceMembers)
      .where(isMember(workspaceId, userId))
      .limit(1)
      .for("update");

    return rows.at(0);
  },

  getAllAdminsForUpdate: async (workspaceId: string, db: Executor = global.db) =>
    db
      .select()
      .from(workspaceMembers)
      .where(and(eq(workspaceMembers.workspaceId, workspaceId), eq(workspaceMembers.role, "admin")))
      .orderBy(asc(workspaceMembers.userId))
      .for("update"),

  getAllWithUsersByWorkspaceId: async (workspaceId: string, db: Executor = global.db) =>
    db
      .select({
        userId: workspaceMembers.userId,
        role: workspaceMembers.role,
        joinedAt: workspaceMembers.joinedAt,
        name: users.name,
        email: users.email,
        avatarId: userAvatars.id,
      })
      .from(workspaceMembers)
      .innerJoin(users, eq(users.id, workspaceMembers.userId))
      .leftJoin(userAvatars, eq(userAvatars.userId, workspaceMembers.userId))
      .where(eq(workspaceMembers.workspaceId, workspaceId))
      .orderBy(asc(users.name), asc(users.email)),

  getAllWithWorkspacesByUserId: async (userId: string, db: Executor = global.db) =>
    db
      .select({ workspace: workspaces, role: workspaceMembers.role, avatarId: workspaceAvatars.id })
      .from(workspaceMembers)
      .innerJoin(workspaces, eq(workspaces.id, workspaceMembers.workspaceId))
      .leftJoin(workspaceAvatars, eq(workspaceAvatars.workspaceId, workspaces.id))
      .where(eq(workspaceMembers.userId, userId))
      .orderBy(asc(workspaceMembers.joinedAt), asc(workspaces.name)),

  getAllMemberCountsByWorkspaceIds: async (workspaceIds: readonly string[], db: Executor = global.db) =>
    workspaceIds.length === 0
      ? []
      : db
          .select({ workspaceId: workspaceMembers.workspaceId, members: count() })
          .from(workspaceMembers)
          .where(inArray(workspaceMembers.workspaceId, [...workspaceIds]))
          .groupBy(workspaceMembers.workspaceId),

  addIfAbsent: async (row: NewWorkspaceMemberRow, db: Executor = global.db) => {
    const rows = await db.insert(workspaceMembers).values(row).onConflictDoNothing().returning({ userId: workspaceMembers.userId });

    return rows.at(0);
  },

  update: async (
    workspaceId: string,
    userId: string,
    patch: WorkspaceMemberPatch,
    db: Executor = global.db,
  ) => {
    const rows = await db
      .update(workspaceMembers)
      .set(patch)
      .where(isMember(workspaceId, userId))
      .returning();

    return rows.at(0);
  },

  delete: async (workspaceId: string, userId: string, db: Executor = global.db) => {
    await db
      .delete(workspaceMembers)
      .where(isMember(workspaceId, userId));
  },
};
