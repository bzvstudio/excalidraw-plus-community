import { createAnthropic } from "@ai-sdk/anthropic";
import { createOpenAI } from "@ai-sdk/openai";
import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import type { LanguageModel } from "ai";
import type { Env } from "./config/env.js";
import { AI_KEY_SEAL_KIND, WORKSPACE_AI_BASE_URLS } from "./modules/ai/ai.const.js";
import { createCallsService } from "./modules/calls/calls.service.js";
import { callRoomPrefixFor } from "./modules/calls/calls.utils.js";
import type { CallRooms } from "./modules/calls/calls.type.js";
import { createLiveKitRooms } from "./modules/calls/livekit/livekit.service.js";
import { createApiKeysService } from "./modules/api-keys/api-keys.service.js";
import { createElementsService, editorFontsDir } from "./modules/elements/elements.service.js";
import { createAuditService } from "./modules/audit/audit.service.js";
import { createAiService } from "./modules/ai/ai.service.js";
import type { ModelFactory, WorkspaceAiProvider } from "./modules/ai/ai.type.js";
import { createAuthService } from "./modules/auth/auth.service.js";
import { signInProvidersFrom } from "./modules/auth/auth.utils.js";
import type { AuthDatabase, SignInProviders } from "./modules/auth/auth.type.js";
import type { EmailService } from "./modules/email/email.type.js";
import { createNoopEmailService } from "./modules/email/noop/noop.service.js";
import { createSmtpEmailService } from "./modules/email/smtp/smtp.service.js";
import { BYTES_PER_MB, PRODUCT_NAME } from "./modules/system/system.const.js";
import { createAccessService } from "./modules/access/access.service.js";
import type { AccessChanged } from "./modules/access/access.type.js";
import { createCollabService, createSeatAccess } from "./modules/collab/collab.service.js";
import type { SessionUser } from "./modules/collab/collab.type.js";
import { createCollectionsService } from "./modules/collections/collections.service.js";
import { COMMENT_SEAL_KIND } from "./modules/comments/comments.const.js";
import { createCommentsService } from "./modules/comments/comments.service.js";
import type { CommentsChanged } from "./modules/comments/comments.type.js";
import { createSealer } from "./modules/encryption/encryption.service.js";
import { FILE_SEAL_KIND } from "./modules/files/files.const.js";
import { createFilesService } from "./modules/files/files.service.js";
import type { FileStored } from "./modules/files/files.type.js";
import { LIBRARY_SEAL_KIND } from "./modules/library/library.const.js";
import { createLibraryService } from "./modules/library/library.service.js";
import { SCENE_SEAL_KIND } from "./modules/scenes/scenes.const.js";
import { createScenesService } from "./modules/scenes/scenes.service.js";
import { createSharingService } from "./modules/sharing/sharing.service.js";
import { createMemoryStorage } from "./modules/storage/memory/memory.service.js";
import { createS3Storage } from "./modules/storage/s3/s3.service.js";
import type { StorageProvider } from "./modules/storage/storage.type.js";
import { createSystemService } from "./modules/system/system.service.js";
import { createTeamsService } from "./modules/teams/teams.service.js";
import { THUMBNAIL_SEAL_KIND } from "./modules/thumbnails/thumbnails.const.js";
import { createThumbnailsService } from "./modules/thumbnails/thumbnails.service.js";
import { AVATAR_SEAL_KIND, WORKSPACE_AVATAR_SEAL_KIND } from "./modules/avatars/avatars.const.js";
import { createAvatarsService } from "./modules/avatars/avatars.service.js";
import { createWorkspacesService } from "./modules/workspaces/workspaces.service.js";
import { createRealtimeServer, socketChannel } from "./realtime/server.js";
import { authDatabaseAdapter, connectDatabase } from "./stores/database.js";
import type { Container } from "./types/container.js";

export type ContainerOverrides = {
  languageModel?: LanguageModel;
  visionModel?: LanguageModel;
  workspaceModel?: ModelFactory;
  callRooms?: CallRooms;
  authDatabase?: AuthDatabase;
  email?: EmailService;
  providers?: SignInProviders;
  generateSetupCode?: () => string;
  storage?: StorageProvider;
};

function createStorage(env: Env): StorageProvider {
  if (env.STORAGE_PROVIDER === "memory") return createMemoryStorage();

  const { S3_ENDPOINT, S3_REGION, S3_BUCKET, S3_ACCESS_KEY_ID, S3_SECRET_ACCESS_KEY } = env;
  if (!S3_ENDPOINT || !S3_REGION || !S3_BUCKET || !S3_ACCESS_KEY_ID || !S3_SECRET_ACCESS_KEY) {
    throw new Error(
      "S3_ENDPOINT, S3_REGION, S3_BUCKET, S3_ACCESS_KEY_ID and S3_SECRET_ACCESS_KEY are required when STORAGE_PROVIDER=s3",
    );
  }
  return createS3Storage({
    endpoint: S3_ENDPOINT,
    region: S3_REGION,
    bucket: S3_BUCKET,
    accessKeyId: S3_ACCESS_KEY_ID,
    secretAccessKey: S3_SECRET_ACCESS_KEY,
    forcePathStyle: env.S3_FORCE_PATH_STYLE,
  });
}

function createCallRooms(env: Env): CallRooms | undefined {
  const { LIVEKIT_URL, LIVEKIT_API_KEY, LIVEKIT_API_SECRET } = env;
  if (!LIVEKIT_URL || !LIVEKIT_API_KEY || !LIVEKIT_API_SECRET) return undefined;
  return createLiveKitRooms({ url: LIVEKIT_URL, apiKey: LIVEKIT_API_KEY, apiSecret: LIVEKIT_API_SECRET });
}

export function createWorkspaceModel(provider: WorkspaceAiProvider, apiKey: string, modelId: string): LanguageModel {
  const baseURL = WORKSPACE_AI_BASE_URLS[provider];
  return provider === "anthropic" ? createAnthropic({ apiKey, baseURL })(modelId) : createOpenAI({ apiKey, baseURL })(modelId);
}

export function createLanguageModel(env: Env, modelId: string | undefined): LanguageModel | undefined {
  const { AI_PROVIDER, AI_API_KEY, AI_BASE_URL } = env;
  if (!AI_PROVIDER || !modelId) return undefined;
  if (AI_PROVIDER === "anthropic") return createAnthropic({ apiKey: AI_API_KEY })(modelId);
  if (AI_PROVIDER === "openai") return createOpenAI({ apiKey: AI_API_KEY })(modelId);
  return createOpenAICompatible({ name: "compatible", baseURL: AI_BASE_URL ?? "", apiKey: AI_API_KEY })(modelId);
}

function createEmail(env: Env): EmailService {
  const log = (line: string) => console.log(line);
  if (env.EMAIL_PROVIDER === "noop") return createNoopEmailService({ log, logLinks: env.NODE_ENV === "development" });

  const { SMTP_URL, EMAIL_FROM } = env;
  if (!SMTP_URL || !EMAIL_FROM) throw new Error("SMTP_URL and EMAIL_FROM are required when EMAIL_PROVIDER=smtp");
  return createSmtpEmailService({ url: SMTP_URL, from: EMAIL_FROM, requireTls: env.NODE_ENV === "production" }, log);
}

export function createContainer(env: Env, overrides: ContainerOverrides = {}): Container {
  connectDatabase(env.DATABASE_URL, env.DATABASE_POOL_MAX);

  const email = overrides.email ?? createEmail(env);
  const sealer = createSealer({ current: env.ENCRYPTION_KEY, previous: env.ENCRYPTION_KEY_PREVIOUS });
  const access = createAccessService();
  const accessChanged: AccessChanged = (change) => {
    void collab.revalidate(change);
    void calls.revalidate(change);
  };
  const fileStored: FileStored = (sceneId, fileId) => collab.fileReady(sceneId, fileId);
  const commentsChanged: CommentsChanged = (sceneId, threadId) => collab.commentsChanged(sceneId, threadId);
  const sceneLimits = { maxElements: env.SCENE_MAX_ELEMENTS, maxBytes: Math.floor(env.SCENE_MAX_MB * BYTES_PER_MB) };
  const files = createFilesService({
    storage: overrides.storage ?? createStorage(env),
    sealer,
    access,
    maxBytes: Math.floor(env.FILE_MAX_MB * BYTES_PER_MB),
    fileStored,
  });
  const scenes = createScenesService({
    limits: sceneLimits,
    sealer,
    files,
    access,
    accessChanged,
    log: (line) => console.error(line),
  });
  const thumbnails = createThumbnailsService({ sealer, access });
  const avatars = createAvatarsService({ sealer });
  const comments = createCommentsService({ sealer, access, commentsChanged });
  const library = createLibraryService({ sealer, maxBytes: Math.floor(env.SCENE_MAX_MB * BYTES_PER_MB) });
  const workspaces = createWorkspacesService({
    email,
    publicBaseUrl: env.PUBLIC_BASE_URL,
    productName: PRODUCT_NAME,
    files,
    log: (line) => console.error(line),
    accessChanged,
  });
  const secureCookies = env.PUBLIC_BASE_URL.startsWith("https://");
  const sharing = createSharingService({ access, accessChanged, secret: env.AUTH_SECRET, secureCookies });
  const ai = createAiService({
    models: {
      text: overrides.languageModel ?? createLanguageModel(env, env.AI_MODEL),
      vision: overrides.visionModel ?? createLanguageModel(env, env.AI_VISION_MODEL),
    },
    modelFor: overrides.workspaceModel ?? createWorkspaceModel,
    dailyLimit: env.AI_DAILY_LIMIT,
    sealer,
    access,
    workspaces,
    log: (line) => console.error(line),
  });
  const realtime = createRealtimeServer({ publicBaseUrl: env.PUBLIC_BASE_URL, sceneMaxBytes: sceneLimits.maxBytes });
  const sessionUser: SessionUser = (session) => auth.userOfSession(session);
  const collab = createCollabService({
    scenes,
    access,
    sharing,
    workspaces,
    sessionUser,
    channel: socketChannel(realtime),
    limits: sceneLimits,
    log: (line) => console.error(line),
  });
  const calls = createCallsService({
    rooms: overrides.callRooms ?? createCallRooms(env),
    url: env.LIVEKIT_URL,
    roomPrefix: callRoomPrefixFor(env.PUBLIC_BASE_URL),
    seatAccess: createSeatAccess({ access, sharing, workspaces, sessionUser }),
    log: (line) => console.error(line),
  });
  const auth = createAuthService({
    secret: env.AUTH_SECRET,
    publicBaseUrl: env.PUBLIC_BASE_URL,
    database: overrides.authDatabase ?? authDatabaseAdapter(),
    policy: { mode: env.SIGNUP_MODE, allowedDomains: env.SIGNUP_ALLOWED_DOMAINS },
    clientIp: { header: env.CLIENT_IP_HEADER, trustedProxies: env.TRUSTED_PROXIES },
    secureCookies,
    invitations: workspaces,
    providers:
      overrides.providers ??
      signInProvidersFrom({
        googleClientId: env.GOOGLE_CLIENT_ID,
        googleClientSecret: env.GOOGLE_CLIENT_SECRET,
        githubClientId: env.GITHUB_CLIENT_ID,
        githubClientSecret: env.GITHUB_CLIENT_SECRET,
        microsoftClientId: env.MICROSOFT_CLIENT_ID,
        microsoftClientSecret: env.MICROSOFT_CLIENT_SECRET,
        microsoftTenantId: env.MICROSOFT_TENANT_ID,
        oidcIssuerUrl: env.OIDC_ISSUER_URL,
        oidcClientId: env.OIDC_CLIENT_ID,
        oidcClientSecret: env.OIDC_CLIENT_SECRET,
        oidcButtonLabel: env.OIDC_BUTTON_LABEL,
      }),
    email,
    productName: PRODUCT_NAME,
    log: (line) => console.log(line),
    generateSetupCode: overrides.generateSetupCode,
  });

  return {
    env,
    services: {
      auth,
      system: createSystemService({
        productName: PRODUCT_NAME,
        signUpMode: env.SIGNUP_MODE,
        emailEnabled: email.enabled,
        libraryBrowsing: env.LIBRARY_BROWSING,
        aiEnabled: ai.textToDiagramAvailable,
        callsEnabled: calls.available,
        aiDailyLimit: env.AI_DAILY_LIMIT,
        fileMaxBytes: files.maxBytes,
        signInOptions: auth.signInOptions,
        auth,
      }),
      workspaces,
      scenes,
      files,
      thumbnails,
      avatars,
      collections: createCollectionsService({ access, accessChanged }),
      teams: createTeamsService({ accessChanged }),
      library,
      sharing,
      collab,
      comments,
      ai,
      calls,
      apiKeys: createApiKeysService(),
      audit: createAuditService({ retentionDays: env.AUDIT_RETENTION_DAYS }),
      elements: createElementsService({ collab, scenes, fontsDir: editorFontsDir() }),
    },
    resealers: [
      { kind: SCENE_SEAL_KIND, resealNext: scenes.resealNext },
      { kind: FILE_SEAL_KIND, resealNext: files.resealNext, missing: files.missingFromStorage },
      { kind: THUMBNAIL_SEAL_KIND, resealNext: thumbnails.resealNext },
      { kind: AVATAR_SEAL_KIND, resealNext: avatars.resealNext },
      { kind: WORKSPACE_AVATAR_SEAL_KIND, resealNext: avatars.resealNextForWorkspaces },
      { kind: LIBRARY_SEAL_KIND, resealNext: library.resealNext },
      { kind: COMMENT_SEAL_KIND, resealNext: comments.resealNext },
      { kind: AI_KEY_SEAL_KIND, resealNext: ai.resealNext },
    ],
    realtime,
  };
}
