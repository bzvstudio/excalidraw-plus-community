import { z } from "zod";
import type { CommentAnchor } from "./comments.type.js";

export const COMMENT_SEAL_KIND = "comment";

export const COMMENT_MAX_LENGTH = 5_000;

export const commentBodySchema = z.string().trim().min(1, "Write something first").max(COMMENT_MAX_LENGTH);

const coordinate = z.number().min(-1_000_000_000).max(1_000_000_000);

export const commentAnchorSchema: z.ZodType<CommentAnchor> = z.union([
  z.strictObject({
    x: coordinate,
    y: coordinate,
    elementId: z.string().min(1).max(64),
    offsetX: z.number().min(0).max(1),
    offsetY: z.number().min(0).max(1),
  }),
  z.strictObject({ x: coordinate, y: coordinate }),
]);
