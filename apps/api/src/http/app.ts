import type { HttpBindings } from "@hono/node-server";
import { serveStatic } from "@hono/node-server/serve-static";
import { trpcServer } from "@hono/trpc-server";
import { Hono } from "hono";
import { bodyLimit } from "hono/body-limit";
import type { MiddlewareHandler } from "hono";
import { secureHeaders } from "hono/secure-headers";
import { createContextFactory } from "../trpc/context.js";
import { AUTH_BASE_PATH } from "../modules/auth/auth.const.js";
import { FileTooLarge } from "../modules/files/files.utils.js";
import { EMBED_PATH } from "../modules/sharing/sharing.const.js";
import { AI_PATH, API_PATHS, BYTES_PER_MB, FILES_PATH, MCP_PATH, REST_PATH, SHARED_PATH, THUMBNAILS_PATH, AVATARS_PATH } from "../modules/system/system.const.js";
import { createMcpRoutes } from "../mcp/app.js";
import { createRestApi } from "../rest/app.js";
import { rateLimitPerKey } from "./rate-limit.js";
import { REST_FILE_PATH } from "../rest/rest.const.js";
import { restRequestMaxBytes } from "../rest/rest.utils.js";
import { AI_REQUEST_MAX_BYTES } from "../modules/ai/ai.const.js";
import { THUMBNAIL_MAX_BYTES } from "../modules/thumbnails/thumbnails.const.js";
import { ThumbnailTooLarge } from "../modules/thumbnails/thumbnails.utils.js";
import { AVATAR_MAX_BYTES } from "../modules/avatars/avatars.const.js";
import { AvatarTooLarge } from "../modules/avatars/avatars.utils.js";
import { appRouter } from "../trpc/router.js";
import type { Container } from "../types/container.js";
import { callOrigins } from "../modules/calls/calls.utils.js";
import { contentSecurityPolicy, FILE_CONTENT_SECURITY_POLICY } from "./content-security-policy.js";
import { createAiRoutes } from "./routes/ai.routes.js";
import { createFilesRoutes } from "./routes/files.routes.js";
import { createSharedRoutes } from "./routes/shared.routes.js";
import { createThumbnailsRoutes } from "./routes/thumbnails.routes.js";
import { createAvatarsRoutes } from "./routes/avatars.routes.js";
import { createHealthRoutes } from "./routes/health.routes.js";

const ONE_YEAR_IN_SECONDS = 31_536_000;

const REQUEST_ENVELOPE_BYTES = 65_536;

const AUTH_REQUEST_MAX_BYTES = 65_536;

const SHARED_OPEN_MAX_BYTES = 4_096;

function isUnder(prefix: string, path: string): boolean {
  return path === prefix || path.startsWith(`${prefix}/`);
}

function isApiPath(path: string): boolean {
  return API_PATHS.some((prefix) => isUnder(prefix, path));
}

function refuseOtherOrigins(publicBaseUrl: string): MiddlewareHandler {
  return async (c, next) => {
    if (c.req.method !== "GET" && c.req.header("origin") !== publicBaseUrl) {
      return c.json({ error: "Requests from another origin are refused" }, 403);
    }
    await next();
  };
}

export function createApp(container: Container) {
  const { env, services } = container;
  const app = new Hono();

  const sharedHeaders = {
    xFrameOptions: "DENY",
    referrerPolicy: "strict-origin-when-cross-origin",
    strictTransportSecurity:
      env.NODE_ENV === "production" ? `max-age=${ONE_YEAR_IN_SECONDS}; includeSubDomains` : false,
  } as const;
  const appPolicy = contentSecurityPolicy({
    libraryBrowsing: env.LIBRARY_BROWSING,
    callOrigins: env.LIVEKIT_URL ? callOrigins(env.LIVEKIT_URL) : [],
  });
  const appHeaders = secureHeaders({ ...sharedHeaders, contentSecurityPolicy: appPolicy });
  const embedHeaders = secureHeaders({
    ...sharedHeaders,
    xFrameOptions: false,
    contentSecurityPolicy: { ...appPolicy, frameAncestors: env.EMBED_ALLOWED_ORIGINS },
  });
  const fileHeaders = secureHeaders({ ...sharedHeaders, contentSecurityPolicy: FILE_CONTENT_SECURITY_POLICY });
  const servesUploads = (path: string) =>
    isUnder(FILES_PATH, path) || isUnder(THUMBNAILS_PATH, path) || isUnder(AVATARS_PATH, path) || isUnder(SHARED_PATH, path) || REST_FILE_PATH.test(path);
  app.use("*", (c, next) => {
    if (servesUploads(c.req.path)) return fileHeaders(c, next);
    return c.req.path === EMBED_PATH ? embedHeaders(c, next) : appHeaders(c, next);
  });

  app.route("/healthz", createHealthRoutes(services.system));

  const requestLimit = (maxSize: number) =>
    bodyLimit({ maxSize, onError: (c) => c.json({ error: "The request is larger than the server accepts" }, 413) });

  app.use(`${AUTH_BASE_PATH}/*`, requestLimit(AUTH_REQUEST_MAX_BYTES));
  app.on(["GET", "POST"], `${AUTH_BASE_PATH}/*`, (c) =>
    services.auth.handle(c.req.raw, (c.env as Partial<HttpBindings> | undefined)?.incoming?.socket.remoteAddress),
  );

  app.use("/trpc/*", refuseOtherOrigins(env.PUBLIC_BASE_URL));
  app.use("/trpc/*", requestLimit(Math.floor(env.SCENE_MAX_MB * BYTES_PER_MB) + REQUEST_ENVELOPE_BYTES));

  app.use(
    "/trpc/*",
    trpcServer({
      router: appRouter,
      createContext: createContextFactory(services),
      onError: ({ error }) => {
        if (error.code === "INTERNAL_SERVER_ERROR") console.error(error.cause ?? error);
      },
    }),
  );

  app.use(`${AI_PATH}/*`, refuseOtherOrigins(env.PUBLIC_BASE_URL));
  app.use(`${AI_PATH}/scenes/:sceneId/text-to-diagram`, requestLimit(AI_REQUEST_MAX_BYTES.chat));
  app.use(`${AI_PATH}/scenes/:sceneId/diagram-to-code`, requestLimit(AI_REQUEST_MAX_BYTES.frame));
  app.route(AI_PATH, createAiRoutes(services));

  const keyLimit = rateLimitPerKey(env.API_RATE_LIMIT_PER_MINUTE, (c) => c.get("apiKey").keyId);
  app.route(
    REST_PATH,
    createRestApi(services, {
      publicBaseUrl: env.PUBLIC_BASE_URL,
      limit: keyLimit,
      requestMaxBytes: restRequestMaxBytes(env.SCENE_MAX_MB, env.FILE_MAX_MB),
    }),
  );

  app.use(MCP_PATH, requestLimit(restRequestMaxBytes(env.SCENE_MAX_MB, env.FILE_MAX_MB).scene));
  app.route(
    MCP_PATH,
    createMcpRoutes(services, {
      publicBaseUrl: env.PUBLIC_BASE_URL,
      limit: keyLimit,
      requestMaxBytes: restRequestMaxBytes(env.SCENE_MAX_MB, env.FILE_MAX_MB).scene,
      log: (line) => console.error(line),
    }),
  );

  app.use(`${FILES_PATH}/*`, refuseOtherOrigins(env.PUBLIC_BASE_URL));
  app.use(
    `${FILES_PATH}/*`,
    bodyLimit({
      maxSize: services.files.maxBytes,
      onError: (c) => c.json({ error: new FileTooLarge(services.files.maxBytes).message }, 413),
    }),
  );
  app.route(FILES_PATH, createFilesRoutes(services));

  app.use(`${THUMBNAILS_PATH}/*`, refuseOtherOrigins(env.PUBLIC_BASE_URL));
  app.use(
    `${THUMBNAILS_PATH}/*`,
    bodyLimit({
      maxSize: THUMBNAIL_MAX_BYTES,
      onError: (c) => c.json({ error: new ThumbnailTooLarge().message }, 413),
    }),
  );
  app.route(THUMBNAILS_PATH, createThumbnailsRoutes(services));

  app.use(`${AVATARS_PATH}/*`, refuseOtherOrigins(env.PUBLIC_BASE_URL));
  app.use(
    `${AVATARS_PATH}/*`,
    bodyLimit({
      maxSize: AVATAR_MAX_BYTES,
      onError: (c) => c.json({ error: new AvatarTooLarge().message }, 413),
    }),
  );
  app.route(AVATARS_PATH, createAvatarsRoutes(services));

  app.use(`${SHARED_PATH}/*`, refuseOtherOrigins(env.PUBLIC_BASE_URL));
  app.use(`${SHARED_PATH}/open`, requestLimit(SHARED_OPEN_MAX_BYTES));
  app.use(
    `${SHARED_PATH}/*`,
    bodyLimit({
      maxSize: services.files.maxBytes,
      onError: (c) => c.json({ error: new FileTooLarge(services.files.maxBytes).message }, 413),
    }),
  );
  app.route(SHARED_PATH, createSharedRoutes(services));

  const webRoot = env.WEB_DIST_DIR;
  if (webRoot) {
    const serveFile = serveStatic({ root: webRoot });
    const serveIndex = serveStatic({ root: webRoot, path: "index.html" });
    app.use("*", (c, next) => (isApiPath(c.req.path) ? next() : serveFile(c, next)));
    app.use("*", (c, next) => (isApiPath(c.req.path) ? next() : serveIndex(c, next)));
  }

  return app;
}
