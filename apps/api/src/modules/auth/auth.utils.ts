import { timingSafeEqual } from "node:crypto";
import type { InstanceRow, UserRow } from "@repo/db";
import { APIError } from "better-auth/api";
import {
  AUTH_COOKIES,
  HOST_COOKIE_PREFIX,
  OIDC_PROVIDER_ID,
  PASSWORD_SIGN_UP_PATH,
  PROVIDER_CALLBACK_PATH,
  SETUP_CODE_ALPHABET,
  SETUP_CODE_GROUP_LENGTH,
  SIGN_UP_REFUSALS,
  SOCIAL_PROVIDERS,
  USER_NAME_MAX_LENGTH,
  CLIENT_ADDRESS_HEADER,
  CLIENT_IP_FROM_CONNECTION,
  collapseName,
  userNameSchema,
} from "./auth.const.js";
import type {
  ClientIpSource,
  Principal,
  ProviderSettings,
  SignInOption,
  SignInProviders,
  SignUpAttempt,
  SignUpPolicy,
  SignUpRefusal,
  SignUpRefusalCode,
} from "./auth.type.js";

export class UnknownAccount extends Error {
  constructor(email: string) {
    super(`No account uses the address ${email}`);
  }
}

export function emailDomain(email: string): string {
  return email.slice(email.lastIndexOf("@") + 1).toLowerCase();
}

function refusal(code: SignUpRefusalCode, message: string = SIGN_UP_REFUSALS[code]): SignUpRefusal {
  return { code, message };
}

export function signUpRefusal(policy: SignUpPolicy, attempt: SignUpAttempt): SignUpRefusal | undefined {
  if (!attempt.instanceClaimed) return attempt.presentsSetupCode ? undefined : refusal("setup_required");

  if (attempt.presentsInvitation || policy.mode === "open") return undefined;

  if (policy.mode === "domain") {
    if (attempt.viaProvider && !attempt.emailVerified) return refusal("email_unverified");
    return policy.allowedDomains.includes(emailDomain(attempt.email))
      ? undefined
      : refusal(
          "domain_not_allowed",
          `Sign-up is open to ${policy.allowedDomains.map((domain) => `@${domain}`).join(", ")} addresses only. For any other address, ask an admin for an invite link.`,
        );
  }

  return refusal("invitation_required");
}

export function signInProvidersFrom(settings: ProviderSettings): SignInProviders {
  const pair = (clientId: string | undefined, clientSecret: string | undefined) =>
    clientId && clientSecret ? { clientId, clientSecret } : undefined;
  const microsoft = pair(settings.microsoftClientId, settings.microsoftClientSecret);
  const oidc = pair(settings.oidcClientId, settings.oidcClientSecret);
  return {
    google: pair(settings.googleClientId, settings.googleClientSecret),
    github: pair(settings.githubClientId, settings.githubClientSecret),
    microsoft: microsoft && { ...microsoft, tenantId: settings.microsoftTenantId },
    oidc:
      oidc && settings.oidcIssuerUrl
        ? { ...oidc, issuerUrl: settings.oidcIssuerUrl, label: settings.oidcButtonLabel }
        : undefined,
  };
}

export function signInOptions(providers: SignInProviders): SignInOption[] {
  const social = SOCIAL_PROVIDERS.filter(({ id }) => providers[id]).map(({ id, label }) => ({ id, label }));
  return providers.oidc ? [...social, { id: OIDC_PROVIDER_ID, label: providers.oidc.label }] : social;
}

export function isPasswordSignUp(path: string | undefined): boolean {
  return path === PASSWORD_SIGN_UP_PATH;
}

export function isProviderCallback(path: string | undefined): boolean {
  return path?.startsWith(PROVIDER_CALLBACK_PATH) ?? false;
}

export function cookieValue(cookieHeader: string | null | undefined, name: string): string | undefined {
  for (const part of (cookieHeader ?? "").split(";")) {
    const [key, ...value] = part.trim().split("=");
    if (key !== name) continue;
    try {
      return decodeURIComponent(value.join("="));
    } catch {
      return undefined;
    }
  }
  return undefined;
}

export function formatSetupCode(bytes: Uint8Array): string {
  const characters = Array.from(bytes, (byte) => SETUP_CODE_ALPHABET[byte % SETUP_CODE_ALPHABET.length]);
  const groups: string[] = [];
  for (let start = 0; start < characters.length; start += SETUP_CODE_GROUP_LENGTH) {
    groups.push(characters.slice(start, start + SETUP_CODE_GROUP_LENGTH).join(""));
  }
  return groups.join("-");
}

function normaliseSetupCode(code: string): Buffer {
  return Buffer.from(code.toUpperCase().replace(/[^0-9A-Z]/g, ""));
}

export function isSetupCode(presented: string, expected: string): boolean {
  const left = normaliseSetupCode(presented);
  const right = normaliseSetupCode(expected);
  return left.length === right.length && timingSafeEqual(left, right);
}

export function toPrincipal(
  user: Pick<UserRow, "id" | "name" | "email">,
  instance: InstanceRow | undefined,
  avatarId: string | null,
): Principal {
  return {
    userId: user.id,
    name: user.name,
    email: user.email,
    avatarId,
    isInstanceAdmin: instance?.adminUserId === user.id,
  };
}

export function tidyName(name: string): string {
  const parsed = userNameSchema.safeParse(name);
  if (!parsed.success) throw new APIError("BAD_REQUEST", { message: parsed.error.issues[0]!.message });
  return parsed.data;
}

export function providerName(name: string, email: string): string {
  const named = collapseName(name) || (email.split("@")[0] ?? email);
  return Array.from(named).slice(0, USER_NAME_MAX_LENGTH).join("");
}

export function cookieSettings(secure: boolean) {
  if (!secure) return {};
  return {
    useSecureCookies: false,
    defaultCookieAttributes: { secure: true },
    cookies: Object.fromEntries(AUTH_COOKIES.map((cookie) => [cookie, { name: `${HOST_COOKIE_PREFIX}auth.${cookie}` }])),
  };
}

export function clientAddressHeader(source: ClientIpSource): string {
  return source.header === CLIENT_IP_FROM_CONNECTION ? CLIENT_ADDRESS_HEADER : source.header;
}

export function withClientAddress(
  request: Request,
  source: ClientIpSource,
  connectionAddress: string | undefined,
): { request: Request; forwardedChain: boolean } {
  const headers = new Headers(request.headers);
  headers.delete(CLIENT_ADDRESS_HEADER);
  const header = clientAddressHeader(source);
  if (connectionAddress && (source.header === CLIENT_IP_FROM_CONNECTION || !headers.has(header))) headers.set(header, connectionAddress);
  const forwardedChain = source.header !== CLIENT_IP_FROM_CONNECTION && source.trustedProxies.length === 0 && (headers.get(header) ?? "").includes(",");
  return { request: new Request(request, { headers }), forwardedChain };
}
