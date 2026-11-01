import { z } from "zod";

export const AUDIT_CATALOGUE = {
  "member.invited": ["role", "validForDays", "maxUses", "emailed"],
  "invite.revoked": ["role", "reason"],
  "member.joined": ["role"],
  "member.role_changed": ["from", "to"],
  "member.removed": ["role"],
  "member.left": ["role"],
  "member.readmitted": [],
  "share_link.created": ["role", "validForDays"],
  "share_link.revoked": ["role"],
  "api_key.created": ["scope", "validForDays"],
  "api_key.revoked": [],
  "ai_key.set": ["provider", "model", "visionModel"],
  "ai_key.removed": [],
  "workspace.settings_changed": ["guestEditLinks"],
  "workspace.photo_changed": [],
  "workspace.photo_removed": [],
  "team.member_added": ["teamId", "teamName"],
  "team.member_removed": ["teamId", "teamName"],
  "collection.access_changed": ["teamIds"],
  "scene.moved": ["fromCollectionId", "toCollectionId"],
  "scene.deleted": [],
} as const satisfies Record<string, readonly string[]>;

export const AUDIT_ACTIONS = Object.keys(AUDIT_CATALOGUE) as (keyof typeof AUDIT_CATALOGUE)[];

export const AUDIT_PAGE_MAX = 100;

export const DAY_MS = 24 * 60 * 60 * 1000;

export const AUDIT_PRUNE_INTERVAL_MS = DAY_MS;

export const AUDIT_RETENTION_DAYS_DEFAULT = 365;

export const AUDIT_PRUNE_BATCH = 1000;

export const auditFilterSchema = z.object({
  action: z.enum(AUDIT_ACTIONS as [keyof typeof AUDIT_CATALOGUE, ...(keyof typeof AUDIT_CATALOGUE)[]]).optional(),
  actorId: z.string().min(1).max(100).optional(),
  cursor: z.string().max(200).optional(),
  limit: z.number().int().min(1).max(AUDIT_PAGE_MAX).default(50),
});
