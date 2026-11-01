import { randomBytes } from "node:crypto";
import { type BetterAuthPlugin, betterAuth } from "better-auth";
import { APIError, createAuthEndpoint } from "better-auth/api";
import { genericOAuth } from "better-auth/plugins";
import { store } from "../../stores/index.js";
import {
  AUTH_BASE_PATH,
  CLIENT_IP_FROM_CONNECTION,
  INSTANCE_ALREADY_CLAIMED,
  inviteCookieName,
  INVITE_TOKEN_HEADER,
  INVITE_TOKEN_MAX_LENGTH,
  MIN_PASSWORD_LENGTH,
  OIDC_PROVIDER_ID,
  PASSWORD_RESET_VALID_SECONDS,
  RESET_PASSWORD_PATH,
  SETUP_CODE_CHECK_PATH,
  SETUP_CODE_CHECKS_PER_MINUTE,
  SETUP_CODE_GROUP_LENGTH,
  SETUP_CODE_GROUPS,
  SETUP_CODE_HEADER,
  SETUP_PATH,
  NO_PROVIDER_TOKENS,
  PROVIDER_TOKEN_PATHS,
  SIGN_IN_PATH,
} from "./auth.const.js";
import type { EmailService } from "../email/email.type.js";
import { fragmentLink, passwordResetEmail } from "../email/email.utils.js";
import type {
  AuthDatabase,
  AuthService,
  ClientIpSource,
  Invitations,
  SignInProviders,
  SignUpPolicy,
} from "./auth.type.js";
import {
  clientAddressHeader,
  cookieSettings,
  cookieValue,
  withClientAddress,
  formatSetupCode,
  isPasswordSignUp,
  isProviderCallback,
  isSetupCode,
  providerName,
  signInOptions,
  signUpRefusal,
  tidyName,
  toPrincipal,
  UnknownAccount,
} from "./auth.utils.js";

export type AuthServiceOptions = {
  secret: string;
  publicBaseUrl: string;
  database: AuthDatabase;
  policy: SignUpPolicy;
  clientIp: ClientIpSource;
  secureCookies: boolean;
  invitations: Invitations;
  providers: SignInProviders;
  email: EmailService;
  productName: string;
  log: (line: string) => void;
  generateSetupCode?: () => string;
};

function generateRandomSetupCode(): string {
  return formatSetupCode(randomBytes(SETUP_CODE_GROUPS * SETUP_CODE_GROUP_LENGTH));
}

export function createAuthService(options: AuthServiceOptions): AuthService {
  const { secret, publicBaseUrl, database, policy, clientIp, invitations, providers, email, productName, log } =
    options;
  const resetLinkRequests = new Map<string, (link: string) => void>();
  const generateSetupCode = options.generateSetupCode ?? generateRandomSetupCode;
  const claimants = new Set<string>();
  let warnedOfChain = false;
  let setupCode: string | undefined;

  const isInstanceClaimed = async () => Boolean((await store.instance.get())?.adminUserId);

  const presentedInvite = (path: string | undefined, headers: Headers | undefined) => {
    const token = isProviderCallback(path)
      ? cookieValue(headers?.get("cookie"), inviteCookieName(options.secureCookies))
      : headers?.get(INVITE_TOKEN_HEADER);
    return token && token.length <= INVITE_TOKEN_MAX_LENGTH ? token : undefined;
  };

  const usableInvite = async (path: string | undefined, headers: Headers | undefined) => {
    const token = presentedInvite(path, headers);
    return token && (await invitations.isInviteUsable(token)) ? token : undefined;
  };

  const presentsSetupCode = (headers: Headers | undefined) =>
    setupCode !== undefined && isSetupCode(headers?.get(SETUP_CODE_HEADER) ?? "", setupCode);

  const setupCodeCheck = {
    id: "setup-code-check",
    endpoints: {
      checkSetupCode: createAuthEndpoint(SETUP_CODE_CHECK_PATH, { method: "POST" }, (context) =>
        context.json({ valid: presentsSetupCode(context.headers) }),
      ),
    },
  } satisfies BetterAuthPlugin;

  const auth = betterAuth({
    secret,
    baseURL: publicBaseUrl,
    basePath: AUTH_BASE_PATH,
    trustedOrigins: [publicBaseUrl],
    database,
    emailAndPassword: {
      enabled: true,
      minPasswordLength: MIN_PASSWORD_LENGTH,
      autoSignIn: true,
      resetPasswordTokenExpiresIn: PASSWORD_RESET_VALID_SECONDS,
      revokeSessionsOnPasswordReset: true,
      sendResetPassword: async ({ user, token }) => {
        const link = fragmentLink(publicBaseUrl, RESET_PASSWORD_PATH, token);
        const requested = resetLinkRequests.get(user.email.toLowerCase());
        if (requested) return requested(link);
        const message = passwordResetEmail({
          to: user.email,
          productName,
          link,
          validForMinutes: PASSWORD_RESET_VALID_SECONDS / 60,
        });
        void email.send(message).catch((error: unknown) =>
          log(`The password reset email to ${user.email} was not sent: ${error instanceof Error ? error.message : error}`),
        );
      },
    },
    rateLimit: {
      enabled: true,
      storage: "memory",
      customRules: { [SETUP_CODE_CHECK_PATH]: { window: 60, max: SETUP_CODE_CHECKS_PER_MINUTE } },
    },
    advanced: {
      ...cookieSettings(options.secureCookies),
      ipAddress: {
        ipAddressHeaders: [clientAddressHeader(clientIp)],
        trustedProxies:
          clientIp.header !== CLIENT_IP_FROM_CONNECTION && clientIp.trustedProxies.length > 0 ? [...clientIp.trustedProxies] : undefined,
      },
    },
    telemetry: { enabled: false },
    account: { accountLinking: { enabled: true } },
    disabledPaths: [...PROVIDER_TOKEN_PATHS],
    socialProviders: {
      ...(providers.google && { google: { ...providers.google, disableIdTokenSignIn: true } }),
      ...(providers.github && { github: providers.github }),
      ...(providers.microsoft && { microsoft: { ...providers.microsoft, disableIdTokenSignIn: true } }),
    },
    plugins: [
      setupCodeCheck,
      ...(providers.oidc
        ? [
            genericOAuth({
              config: [
                {
                  providerId: OIDC_PROVIDER_ID,
                  name: providers.oidc.label,
                  discoveryUrl: `${providers.oidc.issuerUrl.replace(/\/$/, "")}/.well-known/openid-configuration`,
                  clientId: providers.oidc.clientId,
                  clientSecret: providers.oidc.clientSecret,
                  scopes: ["openid", "email", "profile"],
                  pkce: true,
                  disableProviderLogout: true,
                },
              ],
            }),
          ]
        : []),
    ],
    databaseHooks: {
      account: {
        create: { before: async (account) => ({ data: { ...account, ...NO_PROVIDER_TOKENS } }) },
        update: { before: async (account) => ({ data: { ...account, ...NO_PROVIDER_TOKENS } }) },
      },
      user: {
        create: {
          before: async (user, context) => {
            const name = isPasswordSignUp(context?.path) ? tidyName(user.name) : providerName(user.name, user.email);
            const instanceClaimed = await isInstanceClaimed();
            const claiming = !instanceClaimed && presentsSetupCode(context?.headers);
            const refusal = signUpRefusal(policy, {
              email: user.email,
              viaProvider: !isPasswordSignUp(context?.path),
              emailVerified: user.emailVerified,
              instanceClaimed,
              presentsSetupCode: claiming,
              presentsInvitation: Boolean(await usableInvite(context?.path, context?.headers)),
            });
            if (refusal && context && isProviderCallback(context.path)) {
              throw context.redirect(`${publicBaseUrl}${SIGN_IN_PATH}?error=${refusal.code}`);
            }
            if (refusal) throw new APIError("FORBIDDEN", { message: refusal.message });
            if (claiming) claimants.add(user.email);
            return { data: { ...user, name } };
          },
          after: async (user, context) => {
            const invite = await usableInvite(context?.path, context?.headers);
            if (invite) await invitations.acceptInvite(user.id, invite);
            if (!claimants.delete(user.email)) return;
            if (await store.instance.updateUnclaimed(user.id)) {
              setupCode = undefined;
              log("The instance has been claimed; its setup code no longer works");
              return;
            }
            await context?.context.internalAdapter.deleteUser(user.id);
            throw new APIError("FORBIDDEN", { message: INSTANCE_ALREADY_CLAIMED });
          },
        },
        update: {
          before: async (user) => (typeof user.name === "string" ? { data: { ...user, name: tidyName(user.name) } } : undefined),
        },
      },
    },
  });

  return {
    signInOptions: signInOptions(providers),

    handle: (request, connectionAddress) => {
      const { request: addressed, forwardedChain } = withClientAddress(request, clientIp, connectionAddress);
      if (forwardedChain && !warnedOfChain) {
        warnedOfChain = true;
        log(`${clientIp.header} holds a chain of addresses and TRUSTED_PROXIES is empty, so sign-in limits cannot tell visitors apart`);
      }
      return auth.handler(addressed);
    },

    principalFor: async (headers) => {
      const session = await auth.api.getSession({ headers });
      if (!session) return null;
      const [instance, avatarId] = await Promise.all([
        store.instance.get(),
        store.userAvatars.getIdByUserId(session.user.id),
      ]);
      return toPrincipal(session.user, instance, avatarId);
    },

    userOfSession: async (cookie) => {
      const session = await auth.api.getSession({ headers: new Headers({ cookie }), query: { disableRefresh: true } });
      return session?.user.id ?? null;
    },

    isInstanceClaimed,

    createPasswordResetLink: async (address) => {
      const key = address.trim().toLowerCase();
      let link: string | undefined;
      resetLinkRequests.set(key, (created) => {
        link = created;
      });
      try {
        await auth.api.requestPasswordReset({ body: { email: key } });
      } finally {
        resetLinkRequests.delete(key);
      }
      if (!link) throw new UnknownAccount(key);
      return link;
    },

    announceSetupCode: async () => {
      if (await isInstanceClaimed()) return;
      setupCode = generateSetupCode();
      log(`This instance has no administrator yet. Open ${publicBaseUrl}${SETUP_PATH} and enter the setup code ${setupCode} to claim it.`);
    },
  };
}
