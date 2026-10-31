import type { BetterAuthOptions } from "better-auth";
export type SignUpMode = "invite" | "domain" | "open";

export type SignUpPolicy = {
  mode: SignUpMode;
  allowedDomains: readonly string[];
};

export type SocialProviderId = "google" | "github" | "microsoft";

export type ProviderCredentials = {
  clientId: string;
  clientSecret: string;
};

export type SignInProviders = {
  google?: ProviderCredentials;
  github?: ProviderCredentials;
  microsoft?: ProviderCredentials & { tenantId: string };
  oidc?: ProviderCredentials & { issuerUrl: string; label: string };
};

export type SignInProviderId = SocialProviderId | "oidc";

export type SignInOption = {
  id: SignInProviderId;
  label: string;
};

export type ProviderSettings = {
  googleClientId?: string;
  googleClientSecret?: string;
  githubClientId?: string;
  githubClientSecret?: string;
  microsoftClientId?: string;
  microsoftClientSecret?: string;
  microsoftTenantId: string;
  oidcIssuerUrl?: string;
  oidcClientId?: string;
  oidcClientSecret?: string;
  oidcButtonLabel: string;
};

export type SignUpRefusalCode = "setup_required" | "invitation_required" | "domain_not_allowed" | "email_unverified";

export type SignUpRefusal = {
  code: SignUpRefusalCode;
  message: string;
};

export type SignUpAttempt = {
  email: string;
  viaProvider: boolean;
  emailVerified: boolean;
  instanceClaimed: boolean;
  presentsSetupCode: boolean;
  presentsInvitation: boolean;
};

export type Invitations = {
  isInviteUsable: (token: string) => Promise<boolean>;
  acceptInvite: (userId: string, token: string) => Promise<unknown>;
};

export type ClientIpSource = {
  header: string;
  trustedProxies: readonly string[];
};

export type Principal = {
  userId: string;
  name: string;
  email: string;
  avatarId: string | null;
  isInstanceAdmin: boolean;
};

export type AuthDatabase = NonNullable<BetterAuthOptions["database"]>;

export type AuthService = {
  handle: (request: Request, connectionAddress?: string) => Promise<Response>;
  principalFor: (headers: Headers) => Promise<Principal | null>;
  userOfSession: (cookie: string) => Promise<string | null>;
  isInstanceClaimed: () => Promise<boolean>;
  announceSetupCode: () => Promise<void>;
  createPasswordResetLink: (email: string) => Promise<string>;
  signInOptions: SignInOption[];
};
