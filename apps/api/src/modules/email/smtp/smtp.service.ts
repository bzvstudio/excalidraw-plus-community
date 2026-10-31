import { createTransport } from "nodemailer";
import type { EmailService } from "../email.type.js";
import { auditLine } from "../email.utils.js";
import type { SmtpConfig } from "./smtp.type.js";
import { smtpTransportUrl } from "./smtp.utils.js";

export function createSmtpEmailService(config: SmtpConfig, log: (line: string) => void): EmailService {
  const transporter = createTransport(smtpTransportUrl(config.url, config.requireTls));

  return {
    enabled: true,
    send: async (email) => {
      await transporter.sendMail({ from: config.from, to: email.to, subject: email.subject, text: email.text, html: email.html });
      log(auditLine(email, false));
    },
  };
}
