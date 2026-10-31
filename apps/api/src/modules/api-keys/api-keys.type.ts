import type { ApiKeyActor, ApiKeyScope, Membership } from "../authorization/authorization.type.js";
import type { API_KEY_VALIDITY_DAYS } from "./api-keys.const.js";

export type ApiKeyStatus = "active" | "expired" | "revoked";

export type ApiKeySummary = {
  id: string;
  name: string;
  scope: ApiKeyScope;
  visiblePrefix: string;
  createdAt: Date;
  expiresAt: Date | null;
  lastUsedAt: Date | null;
  revokedAt: Date | null;
};

export type ApiKeyView = ApiKeySummary & {
  status: ApiKeyStatus;
  createdBy: string | null;
  createdByName: string | null;
};

export type NewApiKey = {
  name: string;
  scope: ApiKeyScope;
  validForDays: (typeof API_KEY_VALIDITY_DAYS)[number] | null;
};

export type ApiKeysService = {
  create: (actor: Membership, input: NewApiKey) => Promise<{ key: Omit<ApiKeyView, "createdBy" | "createdByName">; secret: string }>;
  list: (actor: Membership) => Promise<ApiKeyView[]>;
  revoke: (actor: Membership, keyId: string) => Promise<void>;
  authenticate: (secret: string) => Promise<ApiKeyActor>;
};
