import { createRoute, OpenAPIHono, z } from "@hono/zod-openapi";
import type { SceneListItem, SceneSummary } from "../../modules/scenes/scenes.type.js";
import type { Services } from "../../types/services.js";
import { SCENE_PAGE_DEFAULT, SCENE_PAGE_MAX } from "../../modules/scenes/scenes.const.js";
import type { ApiKeyEnv } from "../../http/api-key.js";
import {
  addedElementsSchema,
  appliedEditsSchema,
  documentSchema,
  elementEditsSchema,
  fileParams,
  newSceneSchema,
  PROBLEMS,
  sceneIdParams,
  scenePatchSchema,
  sceneSchema,
  skeletonsRequestSchema,
} from "../schemas.js";

function sceneOut(scene: SceneSummary & Partial<Pick<SceneListItem, "updatedByName">>) {
  return {
    id: scene.id,
    title: scene.title,
    collectionId: scene.collectionId,
    version: scene.version,
    createdAt: scene.createdAt.toISOString(),
    updatedAt: scene.updatedAt.toISOString(),
    updatedByName: scene.updatedByName ?? null,
  };
}

const json = <Schema extends z.ZodType>(schema: Schema) => ({ content: { "application/json": { schema } } });

const listScenes = createRoute({
  method: "get",
  path: "/scenes",
  summary: "List scenes, newest change first",
  security: [{ apiKey: [] }],
  request: {
    query: z.object({
      collectionId: z.uuid().optional(),
      q: z.string().max(200).optional().openapi({ description: "Find scenes whose title contains this" }),
      cursor: z.string().max(200).optional().openapi({ description: "From the previous page's nextCursor" }),
      limit: z.coerce.number().int().min(1).max(SCENE_PAGE_MAX).default(SCENE_PAGE_DEFAULT),
    }),
  },
  responses: {
    200: { description: "A page of scenes", ...json(z.object({ items: z.array(sceneSchema), nextCursor: z.string().nullable() })) },
    ...PROBLEMS,
  },
});

const createScene = createRoute({
  method: "post",
  path: "/scenes",
  summary: "Create a scene in a collection open to the workspace",
  description: "Takes an .excalidraw document's elements, app state and files; images are stored with the scene.",
  security: [{ apiKey: [] }],
  request: { body: { required: true, ...json(newSceneSchema) } },
  responses: { 201: { description: "The new scene", ...json(sceneSchema) }, ...PROBLEMS },
});

const getScene = createRoute({
  method: "get",
  path: "/scenes/{id}",
  summary: "Read a scene as an .excalidraw document",
  security: [{ apiKey: [] }],
  request: {
    params: sceneIdParams,
    query: z.object({
      files: z.enum(["true", "false"]).default("false").openapi({ description: "Include images as data URLs" }),
    }),
  },
  responses: { 200: { description: "The scene", ...json(documentSchema) }, ...PROBLEMS },
});

const patchScene = createRoute({
  method: "patch",
  path: "/scenes/{id}",
  summary: "Rename a scene, move it to another collection, or both",
  security: [{ apiKey: [] }],
  request: { params: sceneIdParams, body: { required: true, ...json(scenePatchSchema) } },
  responses: { 200: { description: "The scene", ...json(sceneSchema) }, ...PROBLEMS },
});

const editElements = createRoute({
  method: "patch",
  path: "/scenes/{id}/elements",
  summary: "Add, change and delete elements",
  description:
    "Each upserted or deleted element becomes the newest version of itself, whatever version it carried, and reaches everyone with the scene open.",
  security: [{ apiKey: [] }],
  request: { params: sceneIdParams, body: { required: true, ...json(elementEditsSchema) } },
  responses: { 200: { description: "What changed", ...json(appliedEditsSchema) }, ...PROBLEMS },
});

const addSkeletons = createRoute({
  method: "post",
  path: "/scenes/{id}/skeletons",
  summary: "Add shapes described simply",
  description:
    "Turns skeletons into full elements as the editor would: labels measured with the editor's fonts, arrows bound to the shapes they join by id or by label, and shapes without a position placed to the right of the drawing.",
  security: [{ apiKey: [] }],
  request: { params: sceneIdParams, body: { required: true, ...json(skeletonsRequestSchema) } },
  responses: { 201: { description: "The elements added", ...json(addedElementsSchema) }, ...PROBLEMS },
});

const deleteScene = createRoute({
  method: "delete",
  path: "/scenes/{id}",
  summary: "Delete a scene and its images",
  security: [{ apiKey: [] }],
  request: { params: sceneIdParams },
  responses: { 204: { description: "Deleted" }, ...PROBLEMS },
});

const getFile = createRoute({
  method: "get",
  path: "/scenes/{id}/files/{fileId}",
  summary: "Read one of a scene's images",
  security: [{ apiKey: [] }],
  request: { params: fileParams },
  responses: {
    200: { description: "The image", content: { "image/*": { schema: z.string().openapi({ format: "binary" }) } } },
    ...PROBLEMS,
  },
});

export function createSceneRoutes(services: Pick<Services, "scenes" | "files" | "collab" | "elements">, source: string) {
  return new OpenAPIHono<ApiKeyEnv>()
    .openapi(listScenes, async (c) => {
      const { collectionId, q, cursor, limit } = c.req.valid("query");
      const page = await services.scenes.listPage(c.get("apiKey"), { collectionId, titleContains: q }, { cursor, limit });
      return c.json({ items: page.items.map(sceneOut), nextCursor: page.nextCursor }, 200);
    })
    .openapi(createScene, async (c) => {
      const { title, collectionId, document } = c.req.valid("json");
      const scene = await services.scenes.create(c.get("apiKey"), {
        title,
        collectionId,
        content: document && { elements: document.elements, appState: document.appState },
        files: Object.values(document?.files ?? {}),
      });
      return c.json(sceneOut(scene), 201);
    })
    .openapi(getScene, async (c) => {
      const { id } = c.req.valid("param");
      const { scene, files } = await services.scenes.export(c.get("apiKey"), id, { withFiles: c.req.valid("query").files === "true" });
      return c.json(
        {
          type: "excalidraw" as const,
          version: 2 as const,
          source,
          elements: scene.elements,
          appState: scene.appState,
          files: Object.fromEntries(
            files.map((file) => [file.id, { id: file.id, mimeType: file.mimeType, dataURL: `data:${file.mimeType};base64,${file.bytes.toString("base64")}` }]),
          ),
        },
        200,
      );
    })
    .openapi(patchScene, async (c) => {
      const scene = await services.scenes.update(c.get("apiKey"), c.req.valid("param").id, c.req.valid("json"));
      return c.json(sceneOut(scene), 200);
    })
    .openapi(editElements, async (c) => {
      const { id } = c.req.valid("param");
      return c.json(await services.collab.edit(c.get("apiKey"), id, c.req.valid("json")), 200);
    })
    .openapi(addSkeletons, async (c) => {
      const { id } = c.req.valid("param");
      return c.json(await services.elements.addSkeletons(c.get("apiKey"), id, c.req.valid("json").skeletons), 201);
    })
    .openapi(deleteScene, async (c) => {
      await services.scenes.delete(c.get("apiKey"), c.req.valid("param").id);
      return c.body(null, 204);
    })
    .openapi(getFile, async (c) => {
      const { id, fileId } = c.req.valid("param");
      const file = await services.files.get(c.get("apiKey"), id, fileId);
      return c.body(new Uint8Array(file.bytes), 200, { "content-type": file.mimeType, "cache-control": "private, no-store" });
    });
}
