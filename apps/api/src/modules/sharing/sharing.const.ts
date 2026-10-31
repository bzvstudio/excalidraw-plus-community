import { z } from "zod";
import { collapseName, HOST_COOKIE_PREFIX } from "../auth/auth.const.js";

export const SHARE_ROLES = ["view", "edit"] as const;

export const GUEST_COOKIE = "guest";

export const HOST_GUEST_COOKIE = `${HOST_COOKIE_PREFIX}${GUEST_COOKIE}`;

export const GUEST_COOKIE_MAX_AGE_SECONDS = 2_592_000;

export const GUEST_LINKS_KEPT = 20;

export const SHARE_TOKEN_BYTES = 32;

export const SHARE_LINK_VALIDITY_DAYS = [1, 7, 30] as const;

export const SHARE_PATH = "/l";

export const UNKNOWN_SHARE_LINK = "This link does not work. Ask whoever sent it for a new one";

export const EMBED_PATH = "/embed";

export const EMBED_AUTHORIZATION_SCHEME = "Link";

export const EMBED_VISITOR_NAME = "Embed";

export const DAY_MS = 86_400_000;

export const guestNameSchema = z
  .string()
  .transform(collapseName)
  .pipe(z.string().min(1, "Tell the others your name").max(60));

export const visitorSchema = z.object({
  guestId: z.uuid(),
  name: guestNameSchema,
  links: z.array(z.uuid()).max(GUEST_LINKS_KEPT),
});
