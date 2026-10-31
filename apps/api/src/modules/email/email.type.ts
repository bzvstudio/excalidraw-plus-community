export type EmailProvider = "noop" | "smtp";

export type OutgoingEmail = {
  to: string;
  subject: string;
  text: string;
  html: string;
  actionUrl: string;
};

export type EmailService = {
  enabled: boolean;
  send: (email: OutgoingEmail) => Promise<void>;
};
