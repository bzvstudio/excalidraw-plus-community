import { z } from "zod";
import { AI_DAILY_LIMIT_DEFAULT, AI_PROVIDERS } from "../modules/ai/ai.const.js";
import { AUDIT_RETENTION_DAYS_DEFAULT } from "../modules/audit/audit.const.js";
import { CLIENT_ADDRESS_HEADER, SIGN_UP_MODES } from "../modules/auth/auth.const.js";
import { EMAIL_PROVIDERS } from "../modules/email/email.const.js";
import { parseKey } from "../modules/encryption/encryption.utils.js";
import { BUCKET_NAME_PATTERN } from "../modules/storage/s3/s3.const.js";
import { STORAGE_PROVIDERS } from "../modules/storage/storage.const.js";
import { DEFAULT_API_PORT } from "../modules/system/system.const.js";

const DEV_PUBLIC_BASE_URL = "http://localhost:5176";

const SECRET_HINT = "generate one with: openssl rand -base64 32";

const SECRET_DISTINCT_CHARACTERS_MIN = 8;

function encryptionKey(name: string) {
  return z
    .string({ error: `${name} must be 32 random bytes, base64-encoded; ${SECRET_HINT}` })
    .transform((value, ctx) => {
      const key = parseKey(value);
      if (!key) {
        ctx.addIssue({
          code: "custom",
          message: `${name} must be 32 random bytes, base64-encoded; ${SECRET_HINT}`,
        });
        return z.NEVER;
      }
      return key;
    });
}

const PROVIDER_VARIABLES = [
  ["GOOGLE_CLIENT_ID", "GOOGLE_CLIENT_SECRET"],
  ["GITHUB_CLIENT_ID", "GITHUB_CLIENT_SECRET"],
  ["MICROSOFT_CLIENT_ID", "MICROSOFT_CLIENT_SECRET"],
  ["OIDC_ISSUER_URL", "OIDC_CLIENT_ID", "OIDC_CLIENT_SECRET"],
] as const;

const S3_VARIABLES = [
  "S3_ENDPOINT",
  "S3_REGION",
  "S3_BUCKET",
  "S3_ACCESS_KEY_ID",
  "S3_SECRET_ACCESS_KEY",
] as const;

function isPlaceholderSecret(secret: string): boolean {
  return /change[-_ ]?me|placeholder|example/i.test(secret);
}

function isRepetitiveSecret(secret: string): boolean {
  return new Set(secret).size < SECRET_DISTINCT_CHARACTERS_MIN;
}

function isBareOrigin(value: string): boolean {
  const url = new URL(value);
  return url.pathname === "/" && url.search === "" && url.hash === "" && url.username === "" && url.password === "";
}

const envSchema = z
  .object({
    NODE_ENV: z.enum(["development", "test", "production"]),
    PORT: z.coerce.number().int().positive().default(DEFAULT_API_PORT),
    DATABASE_URL: z.string().min(1),
    DATABASE_POOL_MAX: z.coerce.number().int().positive().default(20),
    PUBLIC_BASE_URL: z.url().optional(),
    WEB_DIST_DIR: z.string().min(1).optional(),
    AUTH_SECRET: z
      .string({ error: `AUTH_SECRET is required; ${SECRET_HINT}` })
      .min(32, `AUTH_SECRET must be at least 32 characters; ${SECRET_HINT}`),
    ENCRYPTION_KEY: encryptionKey("ENCRYPTION_KEY"),
    ENCRYPTION_KEY_PREVIOUS: encryptionKey("ENCRYPTION_KEY_PREVIOUS").optional(),
    SIGNUP_MODE: z.enum(SIGN_UP_MODES).default("invite"),
    CLIENT_IP_HEADER: z
      .string()
      .trim()
      .toLowerCase()
      .min(1)
      .refine((header) => header !== CLIENT_ADDRESS_HEADER, `CLIENT_IP_HEADER cannot be ${CLIENT_ADDRESS_HEADER}, which the server sets itself`)
      .default("x-forwarded-for"),
    TRUSTED_PROXIES: z
      .string()
      .default("")
      .transform((value) => value.split(",").map((entry) => entry.trim()).filter(Boolean))
      .pipe(z.array(z.union([z.ipv4(), z.ipv6(), z.cidrv4(), z.cidrv6()]), {
        error: "TRUSTED_PROXIES must be a comma-separated list of IP addresses or CIDR ranges",
      })),
    EMAIL_PROVIDER: z.enum(EMAIL_PROVIDERS).default("noop"),
    SMTP_URL: z.url({ protocol: /^smtps?$/, error: "SMTP_URL must be an smtp:// or smtps:// URL" }).optional(),
    EMAIL_FROM: z.string().min(3).optional(),
    SCENE_MAX_ELEMENTS: z.coerce.number().int().positive().default(20_000),
    SCENE_MAX_MB: z.coerce.number().positive().default(10),
    STORAGE_PROVIDER: z.enum(STORAGE_PROVIDERS).default("memory"),
    S3_ENDPOINT: z.url({ protocol: /^https?$/, error: "S3_ENDPOINT must be an http:// or https:// URL" }).optional(),
    S3_REGION: z.string().trim().min(1).optional(),
    S3_BUCKET: z
      .string()
      .regex(BUCKET_NAME_PATTERN, "S3_BUCKET must be 3-63 lowercase letters, digits, dots and hyphens")
      .optional(),
    S3_ACCESS_KEY_ID: z.string().min(1).optional(),
    S3_SECRET_ACCESS_KEY: z.string().min(1).optional(),
    S3_FORCE_PATH_STYLE: z.stringbool().default(false),
    FILE_MAX_MB: z.coerce.number().positive().default(4),
    LIBRARY_BROWSING: z.stringbool().default(true),
    AI_PROVIDER: z.enum(AI_PROVIDERS).optional(),
    AI_API_KEY: z.string().trim().min(1).optional(),
    AI_MODEL: z.string().trim().min(1).optional(),
    AI_VISION_MODEL: z.string().trim().min(1).optional(),
    AI_BASE_URL: z.url({ protocol: /^https?$/, error: "AI_BASE_URL must be an http:// or https:// URL" }).optional(),
    LIVEKIT_URL: z
      .url({ protocol: /^(wss?|https?)$/, error: "LIVEKIT_URL must be a ws://, wss://, http:// or https:// URL" })
      .refine((url) => new URL(url).pathname === "/", "LIVEKIT_URL must be the server's origin, with no path")
      .optional(),
    LIVEKIT_API_KEY: z.string().trim().min(1).optional(),
    LIVEKIT_API_SECRET: z.string().trim().min(1).optional(),
    API_RATE_LIMIT_PER_MINUTE: z.coerce.number().int().positive().default(120),
    AUDIT_RETENTION_DAYS: z.coerce.number().int().positive().default(AUDIT_RETENTION_DAYS_DEFAULT),
    AI_DAILY_LIMIT: z
      .string()
      .regex(/^\d+$/, "AI_DAILY_LIMIT must be a whole number; 0 means no limit")
      .default(String(AI_DAILY_LIMIT_DEFAULT))
      .transform(Number),
    EMBED_ALLOWED_ORIGINS: z
      .string()
      .default("*")
      .transform((value) => value.split(",").map((entry) => entry.trim()).filter(Boolean))
      .pipe(
        z.union([z.tuple([z.literal("*")]), z.array(z.url({ protocol: /^https?$/ }).refine((value) => URL.canParse(value) && isBareOrigin(value))).min(1)], {
          error: "EMBED_ALLOWED_ORIGINS must be * or a comma-separated list of origins such as https://wiki.example.com",
        }),
      ),
    GOOGLE_CLIENT_ID: z.string().min(1).optional(),
    GOOGLE_CLIENT_SECRET: z.string().min(1).optional(),
    GITHUB_CLIENT_ID: z.string().min(1).optional(),
    GITHUB_CLIENT_SECRET: z.string().min(1).optional(),
    MICROSOFT_CLIENT_ID: z.string().min(1).optional(),
    MICROSOFT_CLIENT_SECRET: z.string().min(1).optional(),
    MICROSOFT_TENANT_ID: z.string().min(1).default("common"),
    OIDC_ISSUER_URL: z.url({ protocol: /^https?$/ }).optional(),
    OIDC_CLIENT_ID: z.string().min(1).optional(),
    OIDC_CLIENT_SECRET: z.string().min(1).optional(),
    OIDC_BUTTON_LABEL: z.string().trim().min(1).max(40).default("Single sign-on"),
    SIGNUP_ALLOWED_DOMAINS: z
      .string()
      .default("")
      .transform((value) =>
        value
          .split(",")
          .map((domain) => domain.trim().toLowerCase().replace(/^@/, ""))
          .filter(Boolean),
      ),
  })
  .superRefine((env, ctx) => {
    if (env.PUBLIC_BASE_URL && !isBareOrigin(env.PUBLIC_BASE_URL)) {
      ctx.addIssue({
        code: "custom",
        path: ["PUBLIC_BASE_URL"],
        message:
          "PUBLIC_BASE_URL must be a bare origin such as https://draw.example.com, with no path, query or fragment",
      });
    }

    const livekit = { LIVEKIT_URL: env.LIVEKIT_URL, LIVEKIT_API_KEY: env.LIVEKIT_API_KEY, LIVEKIT_API_SECRET: env.LIVEKIT_API_SECRET };
    if (Object.values(livekit).some(Boolean)) {
      for (const [key, value] of Object.entries(livekit)) {
        if (!value) ctx.addIssue({ code: "custom", path: [key], message: `${key} is required once any LIVEKIT_ variable is set` });
      }
    }

    if (env.AI_VISION_MODEL && !env.AI_PROVIDER) {
      ctx.addIssue({ code: "custom", path: ["AI_VISION_MODEL"], message: "AI_VISION_MODEL needs AI_PROVIDER to be set" });
    }

    if (env.AI_BASE_URL && env.AI_PROVIDER !== "openai-compatible") {
      ctx.addIssue({
        code: "custom",
        path: ["AI_BASE_URL"],
        message: "AI_BASE_URL is only for AI_PROVIDER=openai-compatible; anthropic and openai use their own address",
      });
    }

    if (env.AI_PROVIDER) {
      const needed: Record<string, string | undefined> =
        env.AI_PROVIDER === "openai-compatible"
          ? { AI_MODEL: env.AI_MODEL, AI_BASE_URL: env.AI_BASE_URL }
          : { AI_MODEL: env.AI_MODEL, AI_API_KEY: env.AI_API_KEY };
      for (const [key, value] of Object.entries(needed)) {
        if (!value) ctx.addIssue({ code: "custom", path: [key], message: `${key} is required when AI_PROVIDER=${env.AI_PROVIDER}` });
      }
    }

    if (env.SIGNUP_MODE === "domain" && env.SIGNUP_ALLOWED_DOMAINS.length === 0) {
      ctx.addIssue({
        code: "custom",
        path: ["SIGNUP_ALLOWED_DOMAINS"],
        message: "SIGNUP_ALLOWED_DOMAINS must list at least one domain when SIGNUP_MODE=domain, such as example.com,example.org",
      });
    }

    for (const group of PROVIDER_VARIABLES) {
      const present = group.filter((key) => env[key]);
      if (present.length === 0 || present.length === group.length) continue;
      for (const key of group.filter((key) => !env[key])) {
        ctx.addIssue({
          code: "custom",
          path: [key],
          message: `${key} is required when ${present.join(" and ")} ${present.length === 1 ? "is" : "are"} set`,
        });
      }
    }

    if (env.EMAIL_PROVIDER === "smtp") {
      for (const key of ["SMTP_URL", "EMAIL_FROM"] as const) {
        if (env[key]) continue;
        ctx.addIssue({ code: "custom", path: [key], message: `${key} is required when EMAIL_PROVIDER=smtp` });
      }
    }

    if (env.S3_ENDPOINT && !isBareOrigin(env.S3_ENDPOINT)) {
      ctx.addIssue({
        code: "custom",
        path: ["S3_ENDPOINT"],
        message: "S3_ENDPOINT must be a bare origin such as https://storage.example.com, with no path or credentials",
      });
    }

    if (env.STORAGE_PROVIDER === "s3") {
      for (const key of S3_VARIABLES) {
        if (env[key]) continue;
        ctx.addIssue({ code: "custom", path: [key], message: `${key} is required when STORAGE_PROVIDER=s3` });
      }
    }

    if (env.NODE_ENV !== "production") return;

    if (env.STORAGE_PROVIDER === "memory") {
      ctx.addIssue({
        code: "custom",
        path: ["STORAGE_PROVIDER"],
        message: "STORAGE_PROVIDER=memory loses every image on restart; set STORAGE_PROVIDER=s3 and the S3_ variables",
      });
    }

    if (env.S3_ENDPOINT && !env.S3_ENDPOINT.startsWith("https://")) {
      ctx.addIssue({
        code: "custom",
        path: ["S3_ENDPOINT"],
        message: "S3_ENDPOINT must be https when NODE_ENV=production; the access key signs every request over it",
      });
    }

    if (env.OIDC_ISSUER_URL && !env.OIDC_ISSUER_URL.startsWith("https://")) {
      ctx.addIssue({
        code: "custom",
        path: ["OIDC_ISSUER_URL"],
        message: "OIDC_ISSUER_URL must be https when NODE_ENV=production; sign-in tokens are exchanged over it",
      });
    }

    if (isPlaceholderSecret(env.AUTH_SECRET)) {
      ctx.addIssue({
        code: "custom",
        path: ["AUTH_SECRET"],
        message: `AUTH_SECRET looks like a placeholder. It signs every session, so anyone who can read it can forge one; ${SECRET_HINT}`,
      });
    }

    if (isRepetitiveSecret(env.AUTH_SECRET)) {
      ctx.addIssue({
        code: "custom",
        path: ["AUTH_SECRET"],
        message: `AUTH_SECRET repeats too few characters to be random. It signs every session, so a guessable one lets anyone forge one; ${SECRET_HINT}`,
      });
    }

    if (!env.PUBLIC_BASE_URL) {
      ctx.addIssue({
        code: "custom",
        path: ["PUBLIC_BASE_URL"],
        message: "PUBLIC_BASE_URL is required when NODE_ENV=production; it is the only origin the app answers for",
      });
    } else if (!env.PUBLIC_BASE_URL.startsWith("https://")) {
      ctx.addIssue({
        code: "custom",
        path: ["PUBLIC_BASE_URL"],
        message:
          "PUBLIC_BASE_URL must be https when NODE_ENV=production; session cookies are Secure and browsers drop them over http",
      });
    }
  })
  .transform((env) => ({
    ...env,
    PUBLIC_BASE_URL: new URL(env.PUBLIC_BASE_URL ?? DEV_PUBLIC_BASE_URL).origin,
  }));

export type Env = z.infer<typeof envSchema>;

export function loadEnv(source: NodeJS.ProcessEnv = process.env): Env {
  const result = envSchema.safeParse(Object.fromEntries(Object.entries(source).filter(([, value]) => value !== "")));

  if (!result.success) {
    const details = result.error.issues
      .map((issue) => `  ${issue.path.join(".") || "(root)"}: ${issue.message}`)
      .join("\n");
    throw new Error(`Invalid environment:\n${details}`);
  }

  return result.data;
}
