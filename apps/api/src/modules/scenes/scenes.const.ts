import { z } from "zod";
import type { SceneAppState } from "./scenes.type.js";

export const SCENE_TITLE_MAX_LENGTH = 120;

export const DELETED_ELEMENT_RETENTION_MS = 86_400_000;

export const DEFAULT_SCENE_TITLE = "Untitled scene";

export const DRAFTS = "drafts";

export const SCENE_LIST_LIMIT_MAX = 100;

export const sceneSearchSchema = z
  .string()
  .trim()
  .max(SCENE_TITLE_MAX_LENGTH)
  .transform((text) => text || undefined);

export const scenePlaceSchema = z
  .union([z.literal(DRAFTS), z.uuid()])
  .transform((place) => (place === DRAFTS ? null : place));

export const SCENE_SEAL_KIND = "scene";

export const SCENE_APP_STATE_KEYS = [
  "viewBackgroundColor",
  "gridSize",
  "gridStep",
  "gridModeEnabled",
] as const satisfies readonly (keyof SceneAppState)[];

export const sceneTitleSchema = z.string().trim().min(1, "Name the scene").max(SCENE_TITLE_MAX_LENGTH);

export const ELEMENT_MAX_DEPTH = 32;

export function nestsWithin(depth: number): (value: unknown) => boolean {
  return (value) => {
    const pending: [unknown, number][] = [[value, 0]];
    for (let next = pending.pop(); next; next = pending.pop()) {
      const [current, level] = next;
      if (typeof current !== "object" || current === null) continue;
      if (level >= depth) return false;
      for (const child of Object.values(current)) pending.push([child, level + 1]);
    }
    return true;
  };
}

export const ELEMENT_TOO_DEEP = `An element's fields may nest at most ${ELEMENT_MAX_DEPTH} levels deep`;

const PROTOTYPE_KEYS = new Set(["__proto__", "constructor", "prototype"]);

export function holdsNoPrototypeKeys(value: unknown): boolean {
  const pending: unknown[] = [value];
  while (pending.length > 0) {
    const current = pending.pop();
    if (typeof current !== "object" || current === null) continue;
    for (const [key, child] of Object.entries(current)) {
      if (PROTOTYPE_KEYS.has(key)) return false;
      pending.push(child);
    }
  }
  return true;
}

export const ELEMENT_PROTOTYPE_KEY = "An element's fields may not be named __proto__, constructor or prototype";

export const sceneElementSchema = z
  .looseObject({
    id: z.string().min(1).max(64),
    version: z.number().int().nonnegative(),
    versionNonce: z.number().int(),
    isDeleted: z.boolean(),
    index: z.string().max(128).nullable().optional(),
    type: z.string().min(1).max(32),
  })
  .refine(nestsWithin(ELEMENT_MAX_DEPTH), ELEMENT_TOO_DEEP)
  .refine(holdsNoPrototypeKeys, ELEMENT_PROTOTYPE_KEY);

export const sceneAppStateSchema = z.object({
  viewBackgroundColor: z.string().max(64).optional(),
  gridSize: z.number().int().positive().max(1000).optional(),
  gridStep: z.number().int().positive().max(1000).optional(),
  gridModeEnabled: z.boolean().optional(),
});

export const sceneContentSchema = z.object({
  elements: z.array(sceneElementSchema),
  appState: sceneAppStateSchema,
});

export const SCENE_PAGE_MAX = 200;

export const SCENE_PAGE_DEFAULT = 50;
