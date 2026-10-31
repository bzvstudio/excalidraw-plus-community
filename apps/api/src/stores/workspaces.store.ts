import { eq } from "drizzle-orm";
import { type NewWorkspaceRow, type WorkspaceRow, workspaces } from "@repo/db";
import type { Executor } from "./database.js";

export type WorkspacePatch = Partial<Pick<WorkspaceRow, "guestEditLinks">>;

export const workspacesStore = {
  get: async (id: string, db: Executor = global.db) => {
    const rows = await db.select().from(workspaces).where(eq(workspaces.id, id)).limit(1);

    return rows.at(0);
  },

  getForUpdate: async (id: string, db: Executor = global.db) => {
    const rows = await db.select().from(workspaces).where(eq(workspaces.id, id)).limit(1).for("update");

    return rows.at(0);
  },

  getBySlug: async (slug: string, db: Executor = global.db) => {
    const rows = await db.select().from(workspaces).where(eq(workspaces.slug, slug)).limit(1);

    return rows.at(0);
  },

  add: async (row: NewWorkspaceRow, db: Executor = global.db) => {
    const rows = await db.insert(workspaces).values(row).returning();

    return rows[0]!;
  },

  update: async (id: string, patch: WorkspacePatch, db: Executor = global.db) => {
    const rows = await db.update(workspaces).set(patch).where(eq(workspaces.id, id)).returning();

    return rows.at(0);
  },
};
