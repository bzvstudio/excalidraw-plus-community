import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import { refusalStatus } from "../http/refusals.js";
import type { ApiKeyActor } from "../modules/authorization/authorization.type.js";
import { WorkspaceAccessDenied } from "../modules/authorization/authorization.utils.js";
import { PRODUCT_NAME } from "../modules/system/system.const.js";
import type { Services } from "../types/services.js";
import { MCP_TOOLS, type McpToolName } from "./tools.js";

const READ_ONLY = "This API key can only read. Ask a workspace admin for a key with write access to change scenes.";

const FAILED = "Something went wrong on the server; try again in a moment.";

function toolConfig<Name extends McpToolName>(name: Name) {
  const { writes, ...config }: (typeof MCP_TOOLS)[Name] = MCP_TOOLS[name];
  return { ...config, annotations: { readOnlyHint: !writes, destructiveHint: false } };
}

function answer(text: string, isError = false): CallToolResult {
  return { content: [{ type: "text", text }], ...(isError && { isError }) };
}

export function createMcpServer(
  services: Pick<Services, "collections" | "scenes" | "elements">,
  key: ApiKeyActor,
  options: { linkBase: () => Promise<string>; log: (line: string) => void },
) {
  const server = new McpServer({ name: PRODUCT_NAME, version: "1" });
  const run = (name: McpToolName, work: () => Promise<unknown>) =>
    work().then(
      (value) => answer(JSON.stringify(value)),
      (error: unknown) => {
        if (!(error instanceof Error) || !refusalStatus(error)) {
          options.log(`MCP tool ${name} failed: ${error instanceof Error ? (error.stack ?? error.message) : String(error)}`);
          return answer(FAILED, true);
        }
        const readOnly = error instanceof WorkspaceAccessDenied && key.scope === "read" && MCP_TOOLS[name].writes;
        return answer(readOnly ? READ_ONLY : error.message, true);
      },
    );

  server.registerTool("list_collections", toolConfig("list_collections"), () =>
    run("list_collections", async () => (await services.collections.list(key)).map(({ id, name }) => ({ id, name }))),
  );

  server.registerTool("list_scenes", toolConfig("list_scenes"), ({ collectionId, query, cursor, limit }) =>
    run("list_scenes", async () => {
      const page = await services.scenes.listPage(key, { collectionId, titleContains: query }, { cursor, limit });
      return {
        scenes: page.items.map(({ id, title, collectionId: inCollection, updatedAt }) => ({ id, title, collectionId: inCollection, updatedAt })),
        nextCursor: page.nextCursor,
      };
    }),
  );

  server.registerTool("get_scene", toolConfig("get_scene"), ({ sceneId, includeElements }) =>
    run("get_scene", () => services.elements.describe(key, sceneId, { includeElements })),
  );

  server.registerTool("create_scene", toolConfig("create_scene"), ({ collectionId, title }) =>
    run("create_scene", async () => {
      const linkBase = await options.linkBase();
      const scene = await services.scenes.create(key, { collectionId, title });
      return { id: scene.id, title: scene.title, link: `${linkBase}${scene.id}` };
    }),
  );

  server.registerTool("rename_scene", toolConfig("rename_scene"), ({ sceneId, title }) =>
    run("rename_scene", async () => {
      const scene = await services.scenes.rename(key, sceneId, title);
      return { id: scene.id, title: scene.title };
    }),
  );

  server.registerTool("add_elements", toolConfig("add_elements"), ({ sceneId, skeletons }) =>
    run("add_elements", () => services.elements.addSkeletons(key, sceneId, skeletons)),
  );

  return server;
}
