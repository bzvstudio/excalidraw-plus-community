import { createHash } from "node:crypto";
import { API_KEY_PREFIX, API_KEY_SECRET_BYTES, API_KEY_VISIBLE_CHARACTERS } from "./api-keys.const.js";
import type { ApiKeyStatus, ApiKeySummary } from "./api-keys.type.js";

export class UnknownApiKey extends Error {
  constructor() {
    super("This API key is not valid");
  }
}

const SECRET_LENGTH = Math.ceil((API_KEY_SECRET_BYTES * 4) / 3);

export function apiKeyFrom(random: Buffer): string {
  return `${API_KEY_PREFIX}${random.toString("base64url")}`;
}

export function looksLikeApiKey(value: string): boolean {
  return value.length === API_KEY_PREFIX.length + SECRET_LENGTH && value.startsWith(API_KEY_PREFIX) && /^[\w-]+$/.test(value);
}

export function hashApiKey(secret: string): string {
  return createHash("sha256").update(secret).digest("hex");
}

export function visiblePrefixOf(secret: string): string {
  return secret.slice(0, API_KEY_PREFIX.length + API_KEY_VISIBLE_CHARACTERS);
}

export function apiKeyStatus(key: Pick<ApiKeySummary, "expiresAt" | "revokedAt">, now: Date): ApiKeyStatus {
  if (key.revokedAt) return "revoked";
  return key.expiresAt && key.expiresAt <= now ? "expired" : "active";
}
