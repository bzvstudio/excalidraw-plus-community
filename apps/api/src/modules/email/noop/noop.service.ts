import type { EmailService } from "../email.type.js";
import { auditLine } from "../email.utils.js";

export function createNoopEmailService(options: { log: (line: string) => void; logLinks: boolean }): EmailService {
  return {
    enabled: false,
    send: async (email) => options.log(`${auditLine(email, options.logLinks)} (not sent: EMAIL_PROVIDER=noop)`),
  };
}
