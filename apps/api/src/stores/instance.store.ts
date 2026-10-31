import { and, eq, isNull } from "drizzle-orm";
import { instance } from "@repo/db";
import type { Executor } from "./database.js";

const SINGLETON_ID = 1;

export const instanceStore = {
  get: async (db: Executor = global.db) => {
    const rows = await db.select().from(instance).where(eq(instance.id, SINGLETON_ID)).limit(1);

    return rows.at(0);
  },

  updateUnclaimed: async (adminUserId: string, db: Executor = global.db) => {
    const rows = await db
      .update(instance)
      .set({ adminUserId, claimedAt: new Date() })
      .where(and(eq(instance.id, SINGLETON_ID), isNull(instance.adminUserId)))
      .returning();

    return rows.at(0);
  },
};
