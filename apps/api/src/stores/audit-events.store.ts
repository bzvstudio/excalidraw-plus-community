import { and, desc, eq, inArray, lt, sql, type SQL } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { apiKeys, auditEvents, type NewAuditEventRow, userAvatars, users } from "@repo/db";
import type { Executor } from "./database.js";

const actorUsers = alias(users, "actor_users");
const targetUsers = alias(users, "target_users");

export const auditEventsStore = {
  add: async (row: NewAuditEventRow, db: Executor = global.db) => {
    await db.insert(auditEvents).values(row);
  },

  getPageWithNamesByWorkspaceId: async (
    workspaceId: string,
    filter: { action?: string; actorId?: string },
    afterSeq: number | undefined,
    limit: number,
    db: Executor = global.db,
  ) => {
    const conditions: (SQL | undefined)[] = [
      eq(auditEvents.workspaceId, workspaceId),
      filter.action === undefined ? undefined : eq(auditEvents.action, filter.action),
      filter.actorId === undefined ? undefined : eq(auditEvents.actorId, filter.actorId),
      afterSeq === undefined ? undefined : lt(auditEvents.seq, afterSeq),
    ];
    return db
      .select({
        event: auditEvents,
        actorUserName: actorUsers.name,
        actorAvatarId: userAvatars.id,
        actorKeyName: apiKeys.name,
        targetUserName: targetUsers.name,
      })
      .from(auditEvents)
      .leftJoin(actorUsers, and(eq(auditEvents.actorKind, "user"), eq(actorUsers.id, auditEvents.actorId)))
      .leftJoin(userAvatars, eq(userAvatars.userId, actorUsers.id))
      .leftJoin(apiKeys, and(eq(auditEvents.actorKind, "key"), eq(sql`${apiKeys.id}::text`, auditEvents.actorId)))
      .leftJoin(targetUsers, and(eq(auditEvents.targetKind, "user"), eq(targetUsers.id, auditEvents.targetId)))
      .where(and(...conditions))
      .orderBy(desc(auditEvents.seq))
      .limit(limit);
  },

  deleteOlderThan: async (cutoff: Date, limit: number, db: Executor = global.db) => {
    const oldest = db.select({ id: auditEvents.id }).from(auditEvents).where(lt(auditEvents.at, cutoff)).limit(limit);
    const rows = await db.delete(auditEvents).where(inArray(auditEvents.id, oldest)).returning({ id: auditEvents.id });

    return rows.length;
  },
};
