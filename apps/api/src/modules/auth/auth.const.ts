import { z } from "zod";
import type { SignUpMode, SignUpRefusalCode, SocialProviderId } from "./auth.type.js";

export const AUTH_BASE_PATH = "/auth";

export const SIGN_UP_MODES = ["invite", "domain", "open"] as const satisfies readonly SignUpMode[];

export const MIN_PASSWORD_LENGTH = 8;

export const USER_NAME_MAX_LENGTH = 80;

export const collapseName = (name: string) => name.replace(/[\p{Cc}\s]+/gu, " ").trim();

export const userNameSchema = z
  .string()
  .transform(collapseName)
  .pipe(
    z
      .string()
      .min(1, "Enter your name")
      .max(USER_NAME_MAX_LENGTH, `Keep your name under ${USER_NAME_MAX_LENGTH} characters`),
  );

export const SETUP_CODE_HEADER = "x-setup-code";

export const HOST_COOKIE_PREFIX = "__Host-";

export const NO_PROVIDER_TOKENS = { accessToken: null, refreshToken: null, idToken: null } as const;

export const PROVIDER_TOKEN_PATHS = ["/get-access-token", "/refresh-token", "/account-info"] as const;

export const AUTH_COOKIES = ["session_token", "session_data", "dont_remember", "account_data", "state", "oauth_state"] as const;

export const CLIENT_IP_FROM_CONNECTION = "none";

export const CLIENT_ADDRESS_HEADER = "x-client-address";

export const INVITE_TOKEN_HEADER = "x-invite-token";

export const INVITE_TOKEN_MAX_LENGTH = 128;

export const INVITE_COOKIE = "pending_invite";

export const inviteCookieName = (secure: boolean) => (secure ? `${HOST_COOKIE_PREFIX}${INVITE_COOKIE}` : INVITE_COOKIE);

export const INVITE_COOKIE_MAX_AGE_SECONDS = 600;

export const OIDC_PROVIDER_ID = "oidc";

export const SOCIAL_PROVIDERS = [
  { id: "google", label: "Google" },
  { id: "github", label: "GitHub" },
  { id: "microsoft", label: "Microsoft" },
] as const satisfies readonly { id: SocialProviderId; label: string }[];

export const PASSWORD_SIGN_UP_PATH = "/sign-up/email";

export const PROVIDER_CALLBACK_PATH = "/callback/";

export const SIGN_UP_REFUSALS = {
  setup_required: "This server hasn't been set up yet. Whoever runs it claims it first, with the setup code from its log.",
  invitation_required: "Accounts here are by invitation. Ask an admin for an invite link.",
  domain_not_allowed: "Accounts here are only for some email domains, and this address isn't on one. Ask an admin for an invite link.",
  email_unverified:
    "Your sign-in provider didn't confirm this email address is yours, so it can't be used here. Ask an admin for an invite link.",
} as const satisfies Record<SignUpRefusalCode, string>;

export const SETUP_CODE_ALPHABET = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";

export const SETUP_CODE_GROUPS = 3;

export const SETUP_CODE_GROUP_LENGTH = 4;

export const SETUP_PATH = "/setup";

export const SIGN_IN_PATH = "/sign-in";

export const RESET_PASSWORD_PATH = "/reset-password";

export const PASSWORD_RESET_VALID_SECONDS = 3_600;

export const INSTANCE_ALREADY_CLAIMED =
  "Someone else claimed this instance a moment ago, so no account was created. Ask them for an invitation.";
