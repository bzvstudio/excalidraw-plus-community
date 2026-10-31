import { lt, sql } from "drizzle-orm";
import { aiUsage } from "@repo/db";
import type { Executor } from "./database.js";

export const aiUsageStore = {
  upsertIncrementBelow: async (userId: string, day: string, limit: number, db: Executor = global.db) => {
    const rows = await db
      .insert(aiUsage)
      .values({ userId, day, count: 1 })
      .onConflictDoUpdate({
        target: [aiUsage.userId, aiUsage.day],
        set: { count: sql`${aiUsage.count} + 1` },
        setWhere: lt(aiUsage.count, limit),
      })
      .returning({ count: aiUsage.count });

    return rows.at(0)?.count;
  },
};
