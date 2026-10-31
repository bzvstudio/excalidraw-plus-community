import { z } from "@hono/zod-openapi";
import { FILE_ID_PATTERN } from "../modules/files/files.const.js";
import { skeletonsSchema } from "../modules/elements/elements.const.js";
import {
  ELEMENT_MAX_DEPTH,
  ELEMENT_PROTOTYPE_KEY,
  ELEMENT_TOO_DEEP,
  holdsNoPrototypeKeys,
  nestsWithin,
  sceneAppStateSchema,
  sceneElementSchema,
  sceneTitleSchema,
} from "../modules/scenes/scenes.const.js";
import { withoutGeneratedPage } from "../modules/scenes/scenes.utils.js";
import { REST_FILES_PER_REQUEST } from "./rest.const.js";

const fileIdSchema = z.string().regex(FILE_ID_PATTERN, "Use letters, digits, - and _ in an image id");

export const problemSchema = z
  .object({
    type: z.string(),
    title: z.string(),
    status: z.number().int(),
    detail: z.string(),
  })
  .openapi("Problem");

export const collectionSchema = z
  .object({
    id: z.uuid(),
    name: z.string(),
    createdAt: z.iso.datetime(),
  })
  .openapi("Collection");

export const sceneSchema = z
  .object({
    id: z.uuid(),
    title: z.string(),
    collectionId: z.uuid().nullable(),
    version: z.number().int(),
    createdAt: z.iso.datetime(),
    updatedAt: z.iso.datetime(),
    updatedByName: z.string().nullable().openapi({ description: "Who changed it last; null for an API key or a former member" }),
  })
  .openapi("Scene");

export const elementSchema = z
  .looseObject(sceneElementSchema.shape)
  .refine(nestsWithin(ELEMENT_MAX_DEPTH), ELEMENT_TOO_DEEP)
  .refine(holdsNoPrototypeKeys, ELEMENT_PROTOTYPE_KEY)
  .transform(withoutGeneratedPage)
  .openapi("Element", {
    description:
      "An Excalidraw element, as in an .excalidraw file. Fields beyond these pass through, except a generated page's HTML in customData.generationData, which is dropped.",
  });

export const fileSchema = z
  .object({
    id: fileIdSchema,
    mimeType: z.string().max(100),
    dataURL: z.string().regex(/^data:[\w/+.-]+;base64,[A-Za-z0-9+/]*={0,2}$/, "Give each image as a base64 data URL"),
    created: z.number().optional(),
  })
  .openapi("File");

const uploadSchema = fileSchema.transform(({ id, dataURL }) => ({
  id,
  bytes: Buffer.from(dataURL.slice(dataURL.indexOf(",") + 1), "base64"),
}));

export const documentSchema = z
  .object({
    type: z.literal("excalidraw"),
    version: z.literal(2),
    source: z.string(),
    elements: z.array(elementSchema),
    appState: sceneAppStateSchema,
    files: z.record(z.string(), fileSchema),
  })
  .openapi("ExcalidrawDocument");

export const newSceneSchema = z
  .object({
    title: sceneTitleSchema.optional(),
    collectionId: z.uuid().optional().openapi({ description: "Required: a collection open to the whole workspace" }),
    document: z
      .object({
        elements: z.array(elementSchema).default([]),
        appState: sceneAppStateSchema.default({}),
        files: z
          .record(fileIdSchema, uploadSchema)
          .default({})
          .refine((files) => Object.entries(files).every(([key, file]) => key === file.id), "Key each image by its id")
          .refine((files) => Object.keys(files).length <= REST_FILES_PER_REQUEST, `Send at most ${REST_FILES_PER_REQUEST} images at once`),
      })
      .optional(),
  })
  .openapi("NewScene");

export const scenePatchSchema = z
  .object({
    title: sceneTitleSchema.optional(),
    collectionId: z.uuid().optional(),
  })
  .refine((patch) => patch.title !== undefined || patch.collectionId !== undefined, "Give a title, a collectionId or both")
  .openapi("ScenePatch");

export const elementEditsSchema = z
  .object({
    upsert: z
      .array(
        z.looseObject({
          ...sceneElementSchema.shape,
          version: z.number().int().nonnegative().default(0),
          versionNonce: z.number().int().default(0),
          isDeleted: z.boolean().default(false),
        })
          .refine(nestsWithin(ELEMENT_MAX_DEPTH), ELEMENT_TOO_DEEP)
          .refine(holdsNoPrototypeKeys, ELEMENT_PROTOTYPE_KEY)
          .transform(withoutGeneratedPage),
      )
      .default([])
      .openapi({ description: "Elements to add or replace whole. Their version and versionNonce are ignored." }),
    delete: z.array(z.string().min(1).max(64)).default([]).openapi({ description: "Ids of elements to delete" }),
  })
  .openapi("ElementEdits");

export const skeletonsRequestSchema = z
  .object({
    skeletons: skeletonsSchema,
  })
  .openapi("Skeletons");

export const addedElementsSchema = z
  .object({ version: z.number().int(), elementIds: z.array(z.string()) })
  .openapi("AddedElements");

export const appliedEditsSchema = z
  .object({ version: z.number().int(), upserted: z.number().int(), deleted: z.number().int() })
  .openapi("AppliedEdits");

export const sceneIdParams = z.object({ id: z.uuid().openapi({ param: { name: "id", in: "path" } }) });

export const fileParams = sceneIdParams.extend({ fileId: fileIdSchema.openapi({ param: { name: "fileId", in: "path" } }) });

const problemResponse = (description: string) => ({
  description,
  content: { "application/problem+json": { schema: problemSchema } },
});

export const PROBLEMS = {
  400: problemResponse("The request is malformed"),
  401: problemResponse("No valid API key was given"),
  403: problemResponse("The key may not do this"),
  404: problemResponse("Not found, or not visible to this key"),
  409: problemResponse("The request conflicts with what is in the scene"),
  429: problemResponse("The key has made too many requests; see Retry-After"),
} as const;
