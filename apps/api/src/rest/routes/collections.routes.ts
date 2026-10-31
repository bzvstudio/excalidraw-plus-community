import { createRoute, OpenAPIHono, z } from "@hono/zod-openapi";
import type { Services } from "../../types/services.js";
import type { ApiKeyEnv } from "../../http/api-key.js";
import { collectionSchema, PROBLEMS } from "../schemas.js";

const listCollections = createRoute({
  method: "get",
  path: "/collections",
  summary: "List the collections a key can see",
  description: "Only collections open to the whole workspace; a key never sees team-only collections.",
  security: [{ apiKey: [] }],
  responses: {
    200: { description: "The collections", content: { "application/json": { schema: z.object({ items: z.array(collectionSchema) }) } } },
    ...PROBLEMS,
  },
});

export function createCollectionRoutes(services: Pick<Services, "collections">) {
  return new OpenAPIHono<ApiKeyEnv>().openapi(listCollections, async (c) => {
    const collections = await services.collections.list(c.get("apiKey"));
    return c.json(
      { items: collections.map(({ id, name, createdAt }) => ({ id, name, createdAt: createdAt.toISOString() })) },
      200,
    );
  });
}
