import { z } from "zod";

export const SKELETONS_MAX = 500;

export const SKELETON_TEXT_MAX = 20_000;

export const LAYOUT_LIMIT = 1_000_000;

export const SUMMARY_LIMITS = { items: 100, text: 120 };

export const RAW_ELEMENTS_MAX = 1_000;

export const PLACEMENT_GAP = 80;

export const EMPTY_SCENE_ORIGIN = { x: 100, y: 120 };

export const ARROW_GAP = 8;

export const ELEMENT_ID_PATTERN = /^[A-Za-z0-9_-]{1,64}$/;

export const EDITOR_FONT_FOLDERS: Record<string, string> = {
  Virgil: "Virgil",
  Helvetica: "Liberation",
  Cascadia: "Cascadia",
  Excalifont: "Excalifont",
  Nunito: "Nunito",
  "Lilita One": "Lilita",
  "Comic Shanns": "ComicShanns",
  "Liberation Sans": "Liberation",
  Assistant: "Assistant",
  Xiaolai: "Xiaolai",
};

export const SKELETON_FONTS = ["Excalifont", "Nunito", "Comic Shanns", "Lilita One", "Virgil", "Cascadia", "Liberation Sans"] as const;

const elementId = z.string().regex(ELEMENT_ID_PATTERN, "Use 1 to 64 letters, digits, - and _ in an id");
const coordinate = z.number().finite().min(-1_000_000).max(1_000_000);

const bothOrNeither = (position: { x?: number; y?: number }) => (position.x === undefined) === (position.y === undefined);
const POSITION_ISSUE = { message: "Give both x and y, or neither", path: ["y"] };
const length = z.number().finite().positive().max(100_000);

const look = {
  strokeColor: z.string().max(32).optional(),
  backgroundColor: z.string().max(32).optional(),
  fillStyle: z.enum(["hachure", "cross-hatch", "solid", "zigzag"]).optional(),
  strokeWidth: z.number().min(0.5).max(32).optional(),
  strokeStyle: z.enum(["solid", "dashed", "dotted"]).optional(),
  roughness: z.number().min(0).max(2).optional(),
  opacity: z.number().min(0).max(100).optional(),
};

const placed = {
  id: elementId.optional(),
  x: coordinate.optional(),
  y: coordinate.optional(),
};

const writing = {
  fontSize: z.number().min(4).max(400).optional(),
  fontFamily: z.enum(SKELETON_FONTS).optional(),
  textAlign: z.enum(["left", "center", "right"]).optional(),
};

const labelSchema = z.strictObject({
  text: z.string().min(1).max(10_000),
  ...writing,
  verticalAlign: z.enum(["top", "middle", "bottom"]).optional(),
});

const shapeSchema = z.strictObject({
  type: z.enum(["rectangle", "ellipse", "diamond"]),
  ...placed,
  width: length.optional(),
  height: length.optional(),
  label: labelSchema.optional(),
  ...look,
}).refine(bothOrNeither, POSITION_ISSUE);

const textSchema = z.strictObject({
  type: z.literal("text"),
  ...placed,
  text: z.string().min(1).max(10_000),
  ...writing,
  ...look,
}).refine(bothOrNeither, POSITION_ISSUE);

const endSchema = z.union([z.strictObject({ id: elementId }), z.strictObject({ label: z.string().min(1).max(10_000) })]);

const linearSchema = z.strictObject({
  type: z.enum(["arrow", "line"]),
  ...placed,
  points: z.array(z.tuple([coordinate, coordinate])).min(2).max(1_000).optional(),
  start: endSchema.optional(),
  end: endSchema.optional(),
  label: labelSchema.optional(),
  startArrowhead: z.enum(["arrow", "bar", "dot", "triangle"]).nullable().optional(),
  endArrowhead: z.enum(["arrow", "bar", "dot", "triangle"]).nullable().optional(),
  ...look,
}).refine(bothOrNeither, POSITION_ISSUE);

const frameSchema = z.strictObject({
  type: z.literal("frame"),
  id: elementId.optional(),
  name: z.string().max(200).optional(),
  children: z.array(elementId).min(1).max(SKELETONS_MAX),
});

function textLengthOf(skeleton: { type: string; text?: string; label?: { text: string } }): number {
  return (skeleton.text?.length ?? 0) + (skeleton.label?.text.length ?? 0);
}

export const skeletonSchema = z.discriminatedUnion("type", [shapeSchema, textSchema, linearSchema, frameSchema]);

export const skeletonsSchema = z
  .array(skeletonSchema)
  .min(1)
  .max(SKELETONS_MAX)
  .refine((skeletons) => {
    const ids = skeletons.flatMap((skeleton) => (skeleton.id ? [skeleton.id] : []));
    return new Set(ids).size === ids.length;
  }, "Give each element its own id")
  .refine(
    (skeletons) => skeletons.reduce((total, skeleton) => total + textLengthOf(skeleton), 0) <= SKELETON_TEXT_MAX,
    `Send at most ${SKELETON_TEXT_MAX} characters of text in one request`,
  );
