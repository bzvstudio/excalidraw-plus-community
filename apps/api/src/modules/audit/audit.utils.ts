import type { NewAuditEventRow } from "@repo/db";
import type { Actor } from "../authorization/authorization.type.js";
import { isApiKey } from "../authorization/authorization.utils.js";
import { AUDIT_CATALOGUE } from "./audit.const.js";
import type { AuditAction, AuditActor, AuditMetadata, AuditService, AuditTarget } from "./audit.type.js";

export class InvalidAuditCursor extends Error {
  constructor() {
    super("This cursor is not one the audit log gave out; start again without it");
  }
}

export function auditActorOf(actor: Actor): AuditActor {
  return isApiKey(actor) ? { kind: "key", keyId: actor.keyId } : { kind: "user", userId: actor.userId };
}

export function auditEvent<Action extends AuditAction>(event: {
  workspaceId: string;
  action: Action;
  actor: AuditActor;
  target?: AuditTarget;
  metadata?: AuditMetadata<Action>;
  at: Date;
}): NewAuditEventRow {
  const allowed: readonly string[] = AUDIT_CATALOGUE[event.action];
  const metadata = event.metadata ?? {};
  const stray = Object.keys(metadata).filter((key) => !allowed.includes(key));
  if (stray.length > 0) throw new Error(`Audit metadata for ${event.action} may not hold ${stray.join(", ")}`);
  const { actor, target } = event;
  return {
    workspaceId: event.workspaceId,
    at: event.at,
    action: event.action,
    actorKind: actor.kind,
    actorId: actor.kind === "user" ? actor.userId : actor.keyId,
    targetKind: target?.kind ?? null,
    targetId: target?.id ?? null,
    targetLabel: target?.label ?? null,
    metadata,
  };
}

export function auditCursorOf(seq: number): string {
  return Buffer.from(`audit:${seq}`).toString("base64url");
}

export function parseAuditCursor(cursor: string): number {
  const match = /^audit:(\d{1,15})$/.exec(Buffer.from(cursor, "base64url").toString("utf8"));
  if (!match) throw new InvalidAuditCursor();
  return Number(match[1]);
}

export function schedulePruning(audit: Pick<AuditService, "prune">, intervalMs: number, log: (line: string) => void): () => void {
  const prune = () =>
    void audit.prune().then(
      (removed) => removed > 0 && log(`Removed ${removed} audit events past their retention`),
      (error: unknown) => log(`Pruning the audit log failed, and will be tried again: ${String(error)}`),
    );
  prune();
  const timer = setInterval(prune, intervalMs);
  timer.unref();
  return () => clearInterval(timer);
}
