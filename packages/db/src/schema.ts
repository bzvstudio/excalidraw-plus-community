import { sql } from "drizzle-orm";
import {
  bigserial,
  boolean,
  check,
  customType,
  date,
  doublePrecision,
  index,
  integer,
  jsonb,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

export const users = pgTable("users", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("email_verified").default(false).notNull(),
  image: text("image"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .$onUpdate(() => new Date())
    .notNull(),
});

export const sessions = pgTable(
  "sessions",
  {
    id: text("id").primaryKey(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    token: text("token").notNull().unique(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
  },
  (table) => [index("sessions_user_id_idx").on(table.userId)],
);

export const accounts = pgTable(
  "accounts",
  {
    id: text("id").primaryKey(),
    accountId: text("account_id").notNull(),
    providerId: text("provider_id").notNull(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    accessToken: text("access_token"),
    refreshToken: text("refresh_token"),
    idToken: text("id_token"),
    accessTokenExpiresAt: timestamp("access_token_expires_at", { withTimezone: true }),
    refreshTokenExpiresAt: timestamp("refresh_token_expires_at", { withTimezone: true }),
    scope: text("scope"),
    password: text("password"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [index("accounts_user_id_idx").on(table.userId)],
);

export const verifications = pgTable(
  "verifications",
  {
    id: text("id").primaryKey(),
    identifier: text("identifier").notNull(),
    value: text("value").notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [index("verifications_identifier_idx").on(table.identifier)],
);

export const instance = pgTable(
  "instance",
  {
    id: integer("id").primaryKey().default(1),
    adminUserId: text("admin_user_id").references(() => users.id, { onDelete: "restrict" }),
    claimedAt: timestamp("claimed_at", { withTimezone: true }),
  },
  (table) => [check("instance_singleton", sql`${table.id} = 1`)],
);

export const workspaces = pgTable("workspaces", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  guestEditLinks: boolean("guest_edit_links").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const workspaceMembers = pgTable(
  "workspace_members",
  {
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    role: text("role", { enum: ["admin", "member", "viewer"] }).notNull(),
    joinedAt: timestamp("joined_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.workspaceId, table.userId] }),
    index("workspace_members_user_id_idx").on(table.userId),
    check("workspace_members_role", sql`${table.role} in ('admin', 'member', 'viewer')`),
  ],
);

export const workspaceRemovals = pgTable(
  "workspace_removals",
  {
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    removedAt: timestamp("removed_at", { withTimezone: true }).notNull(),
  },
  (table) => [primaryKey({ columns: [table.workspaceId, table.userId] })],
);

export const workspaceInvites = pgTable(
  "workspace_invites",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    role: text("role", { enum: ["member", "viewer"] }).notNull(),
    tokenHash: text("token_hash").notNull().unique(),
    createdBy: text("created_by").references(() => users.id, { onDelete: "set null" }),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    revokedAt: timestamp("revoked_at", { withTimezone: true }),
    maxUses: integer("max_uses"),
    useCount: integer("use_count").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("workspace_invites_workspace_id_idx").on(table.workspaceId),
    check("workspace_invites_role", sql`${table.role} in ('member', 'viewer')`),
  ],
);

export const collections = pgTable(
  "collections",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    createdBy: text("created_by").references(() => users.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [index("collections_workspace_id_idx").on(table.workspaceId)],
);

export const teams = pgTable(
  "teams",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [uniqueIndex("teams_workspace_id_name_key").on(table.workspaceId, table.name)],
);

export const teamMembers = pgTable(
  "team_members",
  {
    teamId: uuid("team_id")
      .notNull()
      .references(() => teams.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
  },
  (table) => [primaryKey({ columns: [table.teamId, table.userId] }), index("team_members_user_id_idx").on(table.userId)],
);

export const collectionTeams = pgTable(
  "collection_teams",
  {
    collectionId: uuid("collection_id")
      .notNull()
      .references(() => collections.id, { onDelete: "cascade" }),
    teamId: uuid("team_id")
      .notNull()
      .references(() => teams.id, { onDelete: "no action" }),
  },
  (table) => [primaryKey({ columns: [table.collectionId, table.teamId] }), index("collection_teams_team_id_idx").on(table.teamId)],
);

const bytea = customType<{ data: Buffer; driverData: Buffer }>({
  dataType: () => "bytea",
});

export const scenes = pgTable(
  "scenes",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    collectionId: uuid("collection_id").references(() => collections.id, { onDelete: "restrict" }),
    title: text("title").notNull(),
    content: bytea("content").notNull(),
    contentKeyId: text("content_key_id"),
    version: integer("version").notNull().default(1),
    createdBy: text("created_by").references(() => users.id, { onDelete: "set null" }),
    updatedBy: text("updated_by").references(() => users.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("scenes_workspace_id_updated_at_idx").on(table.workspaceId, table.updatedAt),
    index("scenes_collection_id_idx").on(table.collectionId),
  ],
);

export const sceneFiles = pgTable(
  "scene_files",
  {
    sceneId: uuid("scene_id")
      .notNull()
      .references(() => scenes.id, { onDelete: "cascade" }),
    fileId: text("file_id").notNull(),
    mimeType: text("mime_type").notNull(),
    sizeBytes: integer("size_bytes").notNull(),
    contentKeyId: text("content_key_id").notNull(),
    createdBy: text("created_by").references(() => users.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [primaryKey({ columns: [table.sceneId, table.fileId] })],
);

export const sceneThumbnails = pgTable("scene_thumbnails", {
  sceneId: uuid("scene_id")
    .primaryKey()
    .references(() => scenes.id, { onDelete: "cascade" }),
  image: bytea("image").notNull(),
  contentKeyId: text("content_key_id").notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull(),
});

export const userAvatars = pgTable("user_avatars", {
  userId: text("user_id")
    .primaryKey()
    .references(() => users.id, { onDelete: "cascade" }),
  id: uuid("id").notNull().unique().defaultRandom(),
  image: bytea("image").notNull(),
  contentKeyId: text("content_key_id").notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull(),
});

export const workspaceAvatars = pgTable("workspace_avatars", {
  workspaceId: uuid("workspace_id")
    .primaryKey()
    .references(() => workspaces.id, { onDelete: "cascade" }),
  id: uuid("id").notNull().unique().defaultRandom(),
  image: bytea("image").notNull(),
  contentKeyId: text("content_key_id").notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull(),
});

export const shareLinks = pgTable(
  "share_links",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    sceneId: uuid("scene_id")
      .notNull()
      .references(() => scenes.id, { onDelete: "cascade" }),
    role: text("role", { enum: ["view", "edit"] }).notNull(),
    tokenHash: text("token_hash").notNull().unique(),
    createdBy: text("created_by").references(() => users.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }),
    revokedAt: timestamp("revoked_at", { withTimezone: true }),
  },
  (table) => [
    index("share_links_scene_id_idx").on(table.sceneId),
    check("share_links_role", sql`${table.role} in ('view', 'edit')`),
  ],
);

export const libraries = pgTable("libraries", {
  userId: text("user_id")
    .primaryKey()
    .references(() => users.id, { onDelete: "cascade" }),
  items: bytea("items").notNull(),
  contentKeyId: text("content_key_id").notNull(),
  version: integer("version").notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull(),
});

export const commentThreads = pgTable(
  "comment_threads",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    sceneId: uuid("scene_id")
      .notNull()
      .references(() => scenes.id, { onDelete: "cascade" }),
    x: doublePrecision("x").notNull(),
    y: doublePrecision("y").notNull(),
    elementId: text("element_id"),
    offsetX: doublePrecision("offset_x"),
    offsetY: doublePrecision("offset_y"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
    resolvedAt: timestamp("resolved_at", { withTimezone: true }),
  },
  (table) => [
    index("comment_threads_scene_id_idx").on(table.sceneId),
    check(
      "comment_threads_offset",
      sql`(${table.elementId} is null) = (${table.offsetX} is null) and (${table.elementId} is null) = (${table.offsetY} is null)`,
    ),
  ],
);

export const comments = pgTable(
  "comments",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    threadId: uuid("thread_id")
      .notNull()
      .references(() => commentThreads.id, { onDelete: "cascade" }),
    authorId: text("author_id").references(() => users.id, { onDelete: "set null" }),
    guestId: uuid("guest_id"),
    guestName: text("guest_name"),
    body: bytea("body").notNull(),
    bodyKeyId: text("body_key_id").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
    editedAt: timestamp("edited_at", { withTimezone: true }),
  },
  (table) => [
    index("comments_thread_id_created_at_idx").on(table.threadId, table.createdAt),
    check("comments_guest", sql`(${table.guestId} is null) = (${table.guestName} is null)`),
  ],
);

export const apiKeys = pgTable(
  "api_keys",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    scope: text("scope", { enum: ["read", "write"] }).notNull(),
    createdBy: text("created_by").references(() => users.id, { onDelete: "set null" }),
    visiblePrefix: text("visible_prefix").notNull(),
    secretHash: text("secret_hash").notNull().unique(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }),
    lastUsedAt: timestamp("last_used_at", { withTimezone: true }),
    revokedAt: timestamp("revoked_at", { withTimezone: true }),
  },
  (table) => [index("api_keys_workspace_id_idx").on(table.workspaceId)],
);

export const auditEvents = pgTable(
  "audit_events",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    seq: bigserial("seq", { mode: "number" }).notNull().unique(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    at: timestamp("at", { withTimezone: true }).notNull(),
    action: text("action").notNull(),
    actorKind: text("actor_kind", { enum: ["user", "key"] }).notNull(),
    actorId: text("actor_id").notNull(),
    targetKind: text("target_kind"),
    targetId: text("target_id"),
    targetLabel: text("target_label"),
    metadata: jsonb("metadata").$type<Record<string, unknown>>().notNull(),
  },
  (table) => [index("audit_events_workspace_id_seq_idx").on(table.workspaceId, table.seq), index("audit_events_at_idx").on(table.at)],
);

export const aiUsage = pgTable(
  "ai_usage",
  {
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    day: date("day", { mode: "string" }).notNull(),
    count: integer("count").notNull(),
  },
  (table) => [primaryKey({ columns: [table.userId, table.day] })],
);

export const workspaceAiKeys = pgTable("workspace_ai_keys", {
  workspaceId: uuid("workspace_id")
    .primaryKey()
    .references(() => workspaces.id, { onDelete: "cascade" }),
  provider: text("provider", { enum: ["anthropic", "openai"] }).notNull(),
  model: text("model").notNull(),
  visionModel: text("vision_model"),
  apiKey: bytea("api_key").notNull(),
  apiKeyKeyId: text("api_key_key_id").notNull(),
  lastFour: text("last_four").notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull(),
});

export type UserRow = typeof users.$inferSelect;
export type WorkspaceRow = typeof workspaces.$inferSelect;
export type NewWorkspaceRow = typeof workspaces.$inferInsert;
export type WorkspaceMemberRow = typeof workspaceMembers.$inferSelect;
export type NewWorkspaceMemberRow = typeof workspaceMembers.$inferInsert;
export type WorkspaceRemovalRow = typeof workspaceRemovals.$inferSelect;
export type NewWorkspaceRemovalRow = typeof workspaceRemovals.$inferInsert;
export type WorkspaceInviteRow = typeof workspaceInvites.$inferSelect;
export type NewWorkspaceInviteRow = typeof workspaceInvites.$inferInsert;
export type SceneRow = typeof scenes.$inferSelect;
export type NewSceneRow = typeof scenes.$inferInsert;
export type CollectionRow = typeof collections.$inferSelect;
export type NewCollectionRow = typeof collections.$inferInsert;
export type ShareLinkRow = typeof shareLinks.$inferSelect;
export type NewShareLinkRow = typeof shareLinks.$inferInsert;
export type LibraryRow = typeof libraries.$inferSelect;
export type NewLibraryRow = typeof libraries.$inferInsert;
export type TeamRow = typeof teams.$inferSelect;
export type NewTeamRow = typeof teams.$inferInsert;
export type TeamMemberRow = typeof teamMembers.$inferSelect;
export type CollectionTeamRow = typeof collectionTeams.$inferSelect;
export type SceneThumbnailRow = typeof sceneThumbnails.$inferSelect;
export type NewSceneThumbnailRow = typeof sceneThumbnails.$inferInsert;
export type UserAvatarRow = typeof userAvatars.$inferSelect;
export type NewUserAvatarRow = typeof userAvatars.$inferInsert;
export type WorkspaceAvatarRow = typeof workspaceAvatars.$inferSelect;
export type NewWorkspaceAvatarRow = typeof workspaceAvatars.$inferInsert;
export type SceneFileRow = typeof sceneFiles.$inferSelect;
export type NewSceneFileRow = typeof sceneFiles.$inferInsert;
export type InstanceRow = typeof instance.$inferSelect;
export type CommentThreadRow = typeof commentThreads.$inferSelect;
export type NewCommentThreadRow = typeof commentThreads.$inferInsert;
export type CommentRow = typeof comments.$inferSelect;
export type NewCommentRow = typeof comments.$inferInsert;
export type AiUsageRow = typeof aiUsage.$inferSelect;
export type WorkspaceAiKeyRow = typeof workspaceAiKeys.$inferSelect;
export type NewWorkspaceAiKeyRow = typeof workspaceAiKeys.$inferInsert;
export type ApiKeyRow = typeof apiKeys.$inferSelect;
export type NewApiKeyRow = typeof apiKeys.$inferInsert;
export type AuditEventRow = typeof auditEvents.$inferSelect;
export type NewAuditEventRow = typeof auditEvents.$inferInsert;
