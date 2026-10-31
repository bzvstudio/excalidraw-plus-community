import { z } from "zod";
import { API_KEY_SCOPES } from "../authorization/authorization.const.js";

export const API_KEY_PREFIX = "xplus_";

export const API_KEY_SECRET_BYTES = 32;

export const API_KEY_VISIBLE_CHARACTERS = 6;

export const API_KEY_LAST_USED_INTERVAL_MS = 60_000;

export const DAY_MS = 86_400_000;

export const API_KEY_NAME_MAX_LENGTH = 100;

export const API_KEY_VALIDITY_DAYS = [1, 7, 30, 90, 180, 365] as const;

export const createApiKeySchema = z.object({
  name: z.string().trim().min(1).max(API_KEY_NAME_MAX_LENGTH),
  scope: z.enum(API_KEY_SCOPES),
  validForDays: z.union([...API_KEY_VALIDITY_DAYS.map((days) => z.literal(days)), z.null()]),
});
