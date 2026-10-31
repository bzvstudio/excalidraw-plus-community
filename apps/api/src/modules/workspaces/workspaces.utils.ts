import type { WorkspaceInviteRow, WorkspaceRow } from "@repo/db";
import type { WorkspaceRole } from "../authorization/authorization.type.js";
import { FALLBACK_SLUG, RESERVED_SLUG_SUFFIX, RESERVED_SLUGS, SLUG_ATTEMPTS, SLUG_MAX_LENGTH, UNIQUE_VIOLATION } from "./workspaces.const.js";
import type { InviteMaxUses, InviteProblem, WorkspaceInvite, WorkspaceListItem, WorkspaceSummary } from "./workspaces.type.js";

export class UnknownWorkspace extends Error {
  constructor() {
    super("No such workspace");
  }
}

export class UnknownMember extends Error {
  constructor() {
    super("That person is not a member of this workspace");
  }
}

export class UnknownRemoval extends Error {
  constructor() {
    super("That person has not been removed from this workspace");
  }
}

export class RemovedFromWorkspace extends Error {
  constructor() {
    super("You were removed from this workspace. Ask an admin to let you back in.");
  }
}

export class LastAdministrator extends Error {
  constructor() {
    super("A workspace needs at least one admin. Make someone else an admin first.");
  }
}

export class UnknownInvite extends Error {
  constructor() {
    super("This invite link is not valid");
  }
}

const INVITE_PROBLEM_MESSAGES: Record<InviteProblem, string> = {
  expired: "This invite link has expired. Ask an admin for a new one.",
  revoked: "This invite link has been withdrawn. Ask an admin for a new one.",
  used: "This invite link has already been used. Ask an admin for a new one.",
};

export class InviteNoLongerUsable extends Error {
  constructor(reason: InviteProblem) {
    super(INVITE_PROBLEM_MESSAGES[reason]);
  }
}

export function slugify(name: string): string {
  const slug = name
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, SLUG_MAX_LENGTH)
    .replace(/-+$/g, "");
  return slug || FALLBACK_SLUG;
}

export function preferredSlug(name: string): string {
  const plain = slugify(name);
  return RESERVED_SLUGS.has(plain) ? `${plain}${RESERVED_SLUG_SUFFIX}` : plain;
}

export function slugCandidates(name: string): string[] {
  const base = preferredSlug(name);
  return Array.from({ length: SLUG_ATTEMPTS }, (_, attempt) => (attempt === 0 ? base : `${base}-${attempt + 1}`));
}

export function typedHandle(value: string): string {
  return value
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+/, "")
    .slice(0, SLUG_MAX_LENGTH);
}

export class HandleTaken extends Error {
  constructor() {
    super("Another workspace has that handle. Try another.");
  }
}

export class EmailUnavailable extends Error {
  constructor() {
    super("Email is not set up on this server, so invites can only be shared as links");
  }
}

export class TooManyInviteEmails extends Error {
  constructor() {
    super("You've sent a lot of invites in the last hour. Wait a while, or share an invite link instead.");
  }
}

export function recentWithin(timestamps: readonly number[], now: number, windowMs: number): number[] {
  return timestamps.filter((timestamp) => now - timestamp < windowMs);
}

export function isRefusedInvite(error: unknown): boolean {
  return error instanceof UnknownInvite || error instanceof InviteNoLongerUsable;
}

export function isUniqueViolation(error: unknown): boolean {
  return typeof error === "object" && error !== null && "code" in error && error.code === UNIQUE_VIOLATION;
}

export function inviteProblem(invite: WorkspaceInviteRow, now: Date): InviteProblem | undefined {
  if (invite.maxUses !== null && invite.useCount >= invite.maxUses) return "used";
  if (invite.revokedAt) return "revoked";
  if (invite.expiresAt <= now) return "expired";
  return undefined;
}

export function toWorkspaceSummary(workspace: WorkspaceRow, role: WorkspaceRole, avatarId: string | null): WorkspaceSummary {
  return { id: workspace.id, name: workspace.name, slug: workspace.slug, role, guestEditLinks: workspace.guestEditLinks, avatarId };
}

export function toWorkspaceListItem(
  workspace: WorkspaceRow,
  role: WorkspaceRole,
  avatarId: string | null,
  memberCount: number,
): WorkspaceListItem {
  return { ...toWorkspaceSummary(workspace, role, avatarId), createdAt: workspace.createdAt, memberCount };
}

export function toWorkspaceInvite(invite: WorkspaceInviteRow): WorkspaceInvite {
  return {
    id: invite.id,
    role: invite.role,
    maxUses: invite.maxUses as InviteMaxUses | null,
    uses: invite.useCount,
    expiresAt: invite.expiresAt,
    createdAt: invite.createdAt,
  };
}
