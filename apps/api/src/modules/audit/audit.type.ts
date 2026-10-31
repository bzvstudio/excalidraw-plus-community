import type { Membership } from "../authorization/authorization.type.js";
import type { AUDIT_CATALOGUE } from "./audit.const.js";

export type AuditAction = keyof typeof AUDIT_CATALOGUE;

export type AuditMetadata<Action extends AuditAction> = Partial<Record<(typeof AUDIT_CATALOGUE)[Action][number], string | number | boolean | null | string[]>>;

export type AuditActor = { kind: "user"; userId: string } | { kind: "key"; keyId: string };

export type AuditTarget = { kind: "user" | "invite" | "share_link" | "api_key" | "collection" | "scene" | "workspace"; id: string; label?: string };

export type AuditEntry = {
  id: string;
  at: Date;
  action: AuditAction;
  actor: { kind: AuditActor["kind"]; id: string; name: string | null; avatarId: string | null };
  target: { kind: string; id: string; name: string | null } | null;
  metadata: Record<string, unknown>;
};

export type AuditFilter = { action?: AuditAction; actorId?: string };

export type AuditService = {
  list: (actor: Membership, filter: AuditFilter, page: { cursor?: string; limit: number }) => Promise<{ events: AuditEntry[]; nextCursor: string | null }>;
  prune: () => Promise<number>;
};
