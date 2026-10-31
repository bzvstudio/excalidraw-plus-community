import { OpenAPIHono } from "@hono/zod-openapi";
import type { MiddlewareHandler } from "hono";
import { bodyLimit } from "hono/body-limit";
import { PRODUCT_NAME, REST_PATH } from "../modules/system/system.const.js";
import type { Services } from "../types/services.js";
import { problem, problemFromError, problemFromIssues } from "./problems.js";
import { referencePage } from "./reference.js";
import { authenticateApiKey, type ApiKeyEnv } from "../http/api-key.js";
import { createCollectionRoutes } from "./routes/collections.routes.js";
import { createSceneRoutes } from "./routes/scenes.routes.js";

const RESOURCES = ["/collections", "/scenes", "/scenes/:id", "/scenes/:id/*"];

export function createRestApi(
  services: Pick<Services, "apiKeys" | "collections" | "scenes" | "files" | "collab" | "elements">,
  options: { publicBaseUrl: string; limit: MiddlewareHandler<ApiKeyEnv>; requestMaxBytes: { scene: number; withImages: number } },
) {
  const rest = new OpenAPIHono<ApiKeyEnv>({ defaultHook: (result, c) => (result.success ? undefined : problemFromIssues(result.error.issues, c)) });
  const document = {
    openapi: "3.1.0",
    info: { title: `${PRODUCT_NAME} API`, version: "1" },
    servers: [{ url: `${options.publicBaseUrl}${REST_PATH}` }],
  };

  rest.openAPIRegistry.registerComponent("securitySchemes", "apiKey", { type: "http", scheme: "bearer", description: "A workspace API key" });
  rest.onError(problemFromError);
  rest.notFound((c) => problem(c, 404, "There is no such endpoint"));

  const authenticate = authenticateApiKey(services.apiKeys, (c, message) => problem(c, 401, message));
  const limitedTo = (maxSize: number) =>
    bodyLimit({ maxSize, onError: (c) => problem(c, 413, "The request is larger than the API accepts") });
  const sizedForScene = limitedTo(options.requestMaxBytes.scene);
  const sizedWithImages = limitedTo(options.requestMaxBytes.withImages);
  const sized: MiddlewareHandler<ApiKeyEnv> = (c, next) =>
    c.req.method === "POST" && c.req.routePath.endsWith("/scenes") ? sizedWithImages(c, next) : sizedForScene(c, next);
  for (const path of RESOURCES) rest.use(path, authenticate, options.limit, sized);

  rest.route("/", createCollectionRoutes(services));
  rest.route("/", createSceneRoutes(services, options.publicBaseUrl));
  rest.doc31("/openapi.json", document);
  rest.get("/docs", (c) => c.html(referencePage(rest.getOpenAPI31Document(document))));

  return rest;
}
