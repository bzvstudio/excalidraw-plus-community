import { z } from "zod";
import { ELEMENT_MAX_DEPTH, ELEMENT_PROTOTYPE_KEY, holdsNoPrototypeKeys, nestsWithin } from "../scenes/scenes.const.js";

export const LIBRARY_SEAL_KIND = "library";

export const LIBRARY_SITE = "https://libraries.excalidraw.com";

export const LIBRARY_MAX_ITEMS = 2_000;

export const libraryItemSchema = z
  .looseObject({
    id: z.string().min(1).max(64),
    elements: z.array(z.looseObject({})),
  })
  .refine(nestsWithin(ELEMENT_MAX_DEPTH + 2), "A library item nests too deeply")
  .refine(holdsNoPrototypeKeys, ELEMENT_PROTOTYPE_KEY);

export const libraryItemsSchema = z
  .array(libraryItemSchema)
  .max(LIBRARY_MAX_ITEMS)
  .refine((items) => new Set(items.map(({ id }) => id)).size === items.length, "Each library item needs its own id");
