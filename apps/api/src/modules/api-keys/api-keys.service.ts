import { randomBytes } from "node:crypto";
import { auditActorOf, auditEvent } from "../audit/audit.utils.js";
import { store } from "../../stores/index.js";
import { assertCan } from "../authorization/authorization.utils.js";
import { API_KEY_LAST_USED_INTERVAL_MS, API_KEY_SECRET_BYTES, DAY_MS } from "./api-keys.const.js";
import type { ApiKeysService } from "./api-keys.type.js";
import { apiKeyFrom, apiKeyStatus, hashApiKey, looksLikeApiKey, UnknownApiKey, visiblePrefixOf } from "./api-keys.utils.js";

export function createApiKeysService(options: { now?: () => Date; random?: (bytes: number) => Buffer } = {}): ApiKeysService {
  const now = options.now ?? (() => new Date());
  const random = options.random ?? randomBytes;

  return {
    create: async (actor, { name, scope, validForDays }) => {
      assertCan(actor, "workspace.manage");
      const secret = apiKeyFrom(random(API_KEY_SECRET_BYTES));
      const createdAt = now();
      const key = await store.transaction(async (tx) => {
        const added = await store.apiKeys.add(
          {
            workspaceId: actor.workspaceId,
            name,
            scope,
            createdBy: actor.userId,
            visiblePrefix: visiblePrefixOf(secret),
            secretHash: hashApiKey(secret),
            createdAt,
            expiresAt: validForDays === null ? null : new Date(createdAt.getTime() + validForDays * DAY_MS),
          },
          tx,
        );
        await store.auditEvents.add(
          auditEvent({
            workspaceId: actor.workspaceId,
            action: "api_key.created",
            actor: auditActorOf(actor),
            target: { kind: "api_key", id: added.id, label: name },
            metadata: { scope, validForDays },
            at: createdAt,
          }),
          tx,
        );
        return added;
      });
      return { key: { ...key, status: apiKeyStatus(key, createdAt) }, secret };
    },

    list: async (actor) => {
      assertCan(actor, "workspace.manage");
      const at = now();
      return (await store.apiKeys.getAllWithCreatorsByWorkspaceId(actor.workspaceId)).map((key) => ({
        ...key,
        status: apiKeyStatus(key, at),
      }));
    },

    revoke: async (actor, keyId) => {
      assertCan(actor, "workspace.manage");
      const at = now();
      await store.transaction(async (tx) => {
        const revoked = await store.apiKeys.updateRevokedByIdAndWorkspaceIdIfActive(keyId, actor.workspaceId, at, tx);
        if (!revoked) {
          if (!(await store.apiKeys.getByIdAndWorkspaceId(keyId, actor.workspaceId, tx))) throw new UnknownApiKey();
          return;
        }
        await store.auditEvents.add(
          auditEvent({
            workspaceId: actor.workspaceId,
            action: "api_key.revoked",
            actor: auditActorOf(actor),
            target: { kind: "api_key", id: keyId, label: revoked.name },
            at,
          }),
          tx,
        );
      });
    },

    authenticate: async (secret) => {
      if (!looksLikeApiKey(secret)) throw new UnknownApiKey();
      const key = await store.apiKeys.getBySecretHash(hashApiKey(secret));
      const at = now();
      if (!key || apiKeyStatus(key, at) !== "active") throw new UnknownApiKey();
      await store.apiKeys.updateLastUsedIfBefore(key.id, at, new Date(at.getTime() - API_KEY_LAST_USED_INTERVAL_MS));
      return { workspaceId: key.workspaceId, keyId: key.id, scope: key.scope };
    },
  };
}
