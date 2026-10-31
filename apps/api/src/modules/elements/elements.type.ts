import type { z } from "zod";
import type { Actor } from "../authorization/authorization.type.js";
import type { SceneElement } from "../scenes/scenes.type.js";
import type { skeletonSchema } from "./elements.const.js";

export type Skeleton = z.infer<typeof skeletonSchema>;

export type ShapeSkeleton = Extract<Skeleton, { type: "rectangle" | "ellipse" | "diamond" | "text" }>;

export type Box = { x: number; y: number; width: number; height: number };

export type SceneSummaryView = {
  elementCount: number;
  bounds: Box | null;
  frames: { id: string; name: string | null; children: number }[];
  shapes: { id: string; type: string; label?: string; x: number; y: number; width: number; height: number; frameId?: string }[];
  texts: { id: string; text: string; x: number; y: number; frameId?: string }[];
  arrows: { id: string; type: string; from?: string; to?: string; label?: string }[];
  truncated: boolean;
};

export type SceneDescription = SceneSummaryView & {
  elements?: SceneElement[];
  elementsTruncated?: boolean;
};

export type AddedElements = {
  version: number;
  elementIds: string[];
};

export type ElementsService = {
  addSkeletons: (actor: Actor, sceneId: string, skeletons: readonly Skeleton[]) => Promise<AddedElements>;
  describe: (actor: Actor, sceneId: string, options: { includeElements: boolean }) => Promise<SceneDescription>;
};
