import { z } from "zod";
import { INVITE_TOKEN_MAX_LENGTH, RESET_PASSWORD_PATH } from "../auth/auth.const.js";
import { EMBED_PATH, SHARE_PATH } from "../sharing/sharing.const.js";
import { API_PATHS } from "../system/system.const.js";

export const SLUG_MAX_LENGTH = 48;

export const WORKSPACE_NAME_MAX_LENGTH = 64;


export const SLUG_ATTEMPTS = 20;

export const FALLBACK_SLUG = "team";

export const INVITE_TOKEN_BYTES = 32;

export const INVITE_VALIDITY_DAYS = [1, 7, 30] as const;

export const INVITE_DEFAULT_DAYS = 7;

export const INVITE_MAX_USES = [1, 2, 5, 10, 25, 50] as const;

export const INVITE_DEFAULT_MAX_USES = 1;

export const DAY_MS = 86_400_000;

export const INVITE_PATH = "/invite";

export const WEB_APP_ROOT_PATHS = [
  "new",
  "account",
  "share",
  "sign-in",
  "sign-up",
  "setup",
  "forgot-password",
  "home",
  "onboarding",
  "workspace",
  "settings",
  "w",
  "o",
  "s",
  "g",
  "assets",
  "fonts",
  "favicon.svg",
  "index.html",
] as const;

export const RESERVED_SLUGS: ReadonlySet<string> = new Set([
  ...[...API_PATHS, SHARE_PATH, EMBED_PATH, INVITE_PATH, RESET_PASSWORD_PATH].map((path) => path.split("/")[1]!),
  ...WEB_APP_ROOT_PATHS,
]);

export const RESERVED_SLUG_SUFFIX = "-workspace";

export const INVITE_EMAILS_PER_HOUR = 20;

export const HOUR_MS = 3_600_000;

export const UNIQUE_VIOLATION = "23505";


export const workspaceNameSchema = z
  .string()
  .trim()
  .min(1, "Name the workspace")
  .max(WORKSPACE_NAME_MAX_LENGTH, `Keep the name under ${WORKSPACE_NAME_MAX_LENGTH} characters`)
  .regex(/^\P{Cc}*$/u, "Keep the name on one line");

export const inviteValidityDaysSchema = z.union(INVITE_VALIDITY_DAYS.map((days) => z.literal(days)));

export const inviteMaxUsesSchema = z.union([...INVITE_MAX_USES.map((uses) => z.literal(uses)), z.null()]);

export const inviteTokenSchema = z.string().min(1).max(INVITE_TOKEN_MAX_LENGTH);

export const slugSchema = z.string().min(1).max(SLUG_MAX_LENGTH);

export const HANDLE_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export const handleSchema = z
  .string()
  .trim()
  .min(1, "Choose a handle")
  .max(SLUG_MAX_LENGTH, `Keep the handle under ${SLUG_MAX_LENGTH} characters`)
  .regex(HANDLE_PATTERN, "Use lowercase letters and numbers, with single hyphens between them")
  .refine((handle) => !RESERVED_SLUGS.has(handle), "The app uses that address. Try another.");
