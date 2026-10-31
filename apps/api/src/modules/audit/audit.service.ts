import { store } from "../../stores/index.js";
import { assertCan } from "../authorization/authorization.utils.js";
import { AUDIT_PRUNE_BATCH, DAY_MS } from "./audit.const.js";
import type { AuditAction, AuditService } from "./audit.type.js";
import { auditCursorOf, parseAuditCursor } from "./audit.utils.js";

export function createAuditService(options: { retentionDays: number; now?: () => Date }): AuditService {
  const now = options.now ?? (() => new Date());

  return {
    list: async (actor, filter, { cursor, limit }) => {
      assertCan(actor, "workspace.manage");
      const rows = await store.auditEvents.getPageWithNamesByWorkspaceId(
        actor.workspaceId,
        filter,
        cursor === undefined ? undefined : parseAuditCursor(cursor),
        limit + 1,
      );
      const page = rows.slice(0, limit);
      return {
        events: page.map(({ event, actorUserName, actorAvatarId, actorKeyName, targetUserName }) => ({
          id: event.id,
          at: event.at,
          action: event.action as AuditAction,
          actor: { kind: event.actorKind, id: event.actorId, name: actorUserName ?? actorKeyName, avatarId: actorAvatarId },
          target: event.targetKind && event.targetId ? { kind: event.targetKind, id: event.targetId, name: targetUserName ?? event.targetLabel } : null,
          metadata: event.metadata,
        })),
        nextCursor: rows.length > limit ? auditCursorOf(page.at(-1)!.event.seq) : null,
      };
    },

    prune: async () => {
      const cutoff = new Date(now().getTime() - options.retentionDays * DAY_MS);
      let removed = 0;
      for (;;) {
        const batch = await store.auditEvents.deleteOlderThan(cutoff, AUDIT_PRUNE_BATCH);
        removed += batch;
        if (batch < AUDIT_PRUNE_BATCH) return removed;
      }
    },
  };
}
