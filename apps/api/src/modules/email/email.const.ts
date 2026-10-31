import type { EmailProvider } from "./email.type.js";

export const EMAIL_PROVIDERS = ["noop", "smtp"] as const satisfies readonly EmailProvider[];
