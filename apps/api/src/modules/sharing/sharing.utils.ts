import { createHash, createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import type { ShareLinkRow } from "@repo/db";
import { GUEST_LINKS_KEPT, SHARE_TOKEN_BYTES, UNKNOWN_SHARE_LINK, visitorSchema } from "./sharing.const.js";
import type { ShareLink, ShareRole, Visitor } from "./sharing.type.js";

export class UnknownShareLink extends Error {
  constructor() {
    super(UNKNOWN_SHARE_LINK);
  }
}

export class ShareLinkRevoked extends Error {
  constructor() {
    super("This link was turned off by the people who shared it");
  }
}

export class GuestNameRequired extends Error {
  constructor() {
    super("Tell the others your name");
  }
}

export class ShareLinkExpired extends Error {
  constructor() {
    super("This link has expired. Ask whoever sent it for a new one");
  }
}

export function newShareToken(): string {
  return randomBytes(SHARE_TOKEN_BYTES).toString("base64url");
}

export function hashShareToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export function linkProblem(link: Pick<ShareLinkRow, "revokedAt" | "expiresAt">, now: Date): Error | undefined {
  if (link.revokedAt) return new ShareLinkRevoked();
  if (link.expiresAt && link.expiresAt <= now) return new ShareLinkExpired();
  return undefined;
}

export function effectiveRole(role: ShareRole, guestEditLinks: boolean): ShareRole {
  return role === "edit" && guestEditLinks ? "edit" : "view";
}

export function grantedAccess(
  throughLink: ShareRole,
  member: { canEdit: boolean; access: ShareRole | "none" } | undefined,
): ShareRole {
  if (!member) return throughLink;
  if (member.access !== "none") return member.access;
  return member.canEdit ? throughLink : "view";
}

export function withLink(visitor: Visitor, linkId: string, name: string | undefined): Visitor {
  return {
    guestId: visitor.guestId,
    name: name ?? visitor.name,
    links: [linkId, ...visitor.links.filter((id) => id !== linkId)].slice(0, GUEST_LINKS_KEPT),
  };
}

export function toShareLink(row: ShareLinkRow): ShareLink {
  return { id: row.id, role: row.role, createdBy: row.createdBy, createdAt: row.createdAt, expiresAt: row.expiresAt };
}

function signature(payload: string, secret: string): string {
  return createHmac("sha256", secret).update(`guest:${payload}`).digest("base64url");
}

export function signVisitor(visitor: Visitor, secret: string): string {
  const payload = Buffer.from(JSON.stringify(visitor)).toString("base64url");
  return `${payload}.${signature(payload, secret)}`;
}

export function verifyVisitor(cookie: string | undefined, secret: string): Visitor | undefined {
  const [payload, sent] = cookie?.split(".") ?? [];
  if (!payload || !sent) return undefined;
  const expected = Buffer.from(signature(payload, secret));
  const given = Buffer.from(sent);
  if (expected.length !== given.length || !timingSafeEqual(expected, given)) return undefined;
  try {
    const parsed = visitorSchema.safeParse(JSON.parse(Buffer.from(payload, "base64url").toString("utf8")));
    return parsed.success ? parsed.data : undefined;
  } catch {
    return undefined;
  }
}
