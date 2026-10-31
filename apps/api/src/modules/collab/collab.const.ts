import { z } from "zod";
import { sceneAppStateSchema, sceneContentSchema, sceneElementSchema } from "../scenes/scenes.const.js";
import type { Follow, JoinRequest, Present, Presence } from "./collab.type.js";

export const PERSIST_IDLE_MS = 2_000;

export const PERSIST_MAX_WAIT_MS = 10_000;

export const REVALIDATE_INTERVAL_MS = 60_000;

export const COLLAB_MESSAGE_ENVELOPE_BYTES = 65_536;

export const PING_INTERVAL_MS = 10_000;

export const PING_TIMEOUT_MS = 5_000;

export const PRESENCE_SELECTION_MAX = 1_000;

export const PRESENCE_COORDINATE_LIMIT = 1_000_000_000;

export const PRESENCE_BURST = 40;

export const PRESENCE_PER_SECOND = 25;

export const JOIN_BURST = 5;

export const JOIN_PER_SECOND = 1;

export const PRESENT_BURST = 10;

export const PRESENT_PER_SECOND = 5;

export const joinSchema: z.ZodType<JoinRequest> = z.union([
  z.object({ workspaceId: z.uuid(), sceneId: z.uuid() }),
  z.object({ linkId: z.uuid() }),
]);

const id = z.string().min(1).max(64);

const coordinate = z.number().min(-PRESENCE_COORDINATE_LIMIT).max(PRESENCE_COORDINATE_LIMIT);

export const followSchema: z.ZodType<Follow> = z.object({ id, following: z.boolean() });

export const presentSchema: z.ZodType<Present> = z.object({ slideId: id.nullable() });

export const presenceSchema: z.ZodType<Presence> = z.object({
  pointer: z.object({ x: coordinate, y: coordinate, tool: z.enum(["pointer", "laser"]) }).optional(),
  button: z.enum(["up", "down"]).optional(),
  selectedElementIds: z.array(id).max(PRESENCE_SELECTION_MAX).optional(),
    userState: z.enum(["active", "idle", "away"]).optional(),
    viewport: z
      .tuple([coordinate, coordinate, coordinate, coordinate])
      .refine(([minX, minY, maxX, maxY]) => maxX > minX && maxY > minY)
      .optional(),
  });

export function updateSchemaWithin(maxElements: number) {
  return sceneContentSchema.extend({
    elements: z.array(sceneElementSchema).max(maxElements),
    appState: sceneAppStateSchema.optional(),
  });
}
