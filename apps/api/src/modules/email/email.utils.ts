import type { OutgoingEmail } from "./email.type.js";

export function fragmentLink(publicBaseUrl: string, path: string, token: string): string {
  return `${publicBaseUrl}${path}#${token}`;
}

function duration(minutes: number): string {
  if (minutes % 60 === 0) return minutes === 60 ? "one hour" : `${minutes / 60} hours`;
  return `${minutes} minutes`;
}

export function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function layout(paragraphs: string[], action: { label: string; url: string }): string {
  const body = paragraphs.map((paragraph) => `<p>${escapeHtml(paragraph)}</p>`).join("");
  const button = `<p><a href="${escapeHtml(action.url)}">${escapeHtml(action.label)}</a></p>`;
  return `<!doctype html><html><body style="font-family:sans-serif;line-height:1.5">${body}${button}</body></html>`;
}

export function invitationEmail(input: {
  to: string;
  productName: string;
  workspaceName: string;
  role: string;
  inviterName: string;
  link: string;
  validForDays: number;
}): OutgoingEmail {
  const lines = [
    `${input.inviterName} invited you to join ${input.workspaceName} on ${input.productName} as a ${input.role}.`,
    `The link works for ${input.validForDays === 1 ? "1 day" : `${input.validForDays} days`}.`,
  ];
  return {
    to: input.to,
    subject: `Join ${input.workspaceName} on ${input.productName}`,
    text: `${lines.join("\n\n")}\n\n${input.link}\n`,
    html: layout(lines, { label: `Join ${input.workspaceName}`, url: input.link }),
    actionUrl: input.link,
  };
}

export function passwordResetEmail(input: {
  to: string;
  productName: string;
  link: string;
  validForMinutes: number;
}): OutgoingEmail {
  const lines = [
    `Someone asked to reset the password for your ${input.productName} account.`,
    `The link works once, for ${duration(input.validForMinutes)}. If it wasn't you, ignore this email and your password stays as it is.`,
  ];
  return {
    to: input.to,
    subject: `Reset your ${input.productName} password`,
    text: `${lines.join("\n\n")}\n\n${input.link}\n`,
    html: layout(lines, { label: "Choose a new password", url: input.link }),
    actionUrl: input.link,
  };
}

export function auditLine(email: OutgoingEmail, includeLink: boolean): string {
  const line = `Email "${email.subject.replace(/\p{Cc}+/gu, " ")}" to ${email.to}`;
  return includeLink ? `${line}: ${email.actionUrl}` : line;
}
