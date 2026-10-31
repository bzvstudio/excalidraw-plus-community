import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";
import { Hono, type MiddlewareHandler } from "hono";
import { authenticateApiKey, type ApiKeyEnv } from "../http/api-key.js";
import type { Services } from "../types/services.js";
import { createMcpServer } from "./server.js";

const NO_BATCHES = { code: -32600, message: "Send one request at a time; batches are not accepted" };

export function createMcpRoutes(
  services: Pick<Services, "apiKeys" | "collections" | "scenes" | "elements" | "workspaces">,
  options: { publicBaseUrl: string; limit: MiddlewareHandler<ApiKeyEnv>; requestMaxBytes: number; log: (line: string) => void },
) {
  return new Hono<ApiKeyEnv>()
    .on(["GET", "DELETE"], "/", (c) => c.json({ error: "This server answers POST only; it keeps no sessions or streams" }, 405, { Allow: "POST" }))
    .use("/", authenticateApiKey(services.apiKeys, (c, message) => c.json({ error: message }, 401)))
    .use("/", options.limit)
    .post("/", async (c) => {
      const body: unknown = await c.req.raw.clone().json().catch(() => undefined);
      if (Array.isArray(body)) return c.json({ jsonrpc: "2.0", id: null, error: NO_BATCHES }, 400);
      const key = c.get("apiKey");
      const linkBase = async () => `${options.publicBaseUrl}/${await services.workspaces.slugOf(key.workspaceId)}/scenes/`;
      const server = createMcpServer(services, key, { linkBase, log: options.log });
      const transport = new WebStandardStreamableHTTPServerTransport({
        sessionIdGenerator: undefined,
        enableJsonResponse: true,
        maxRequestBodySize: options.requestMaxBytes,
      });
      await server.connect(transport);
      try {
        return await transport.handleRequest(c.req.raw);
      } finally {
        await server.close();
      }
    });
}
