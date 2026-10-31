import { randomUUID } from "node:crypto";
import { existsSync, readdirSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { FONT_FAMILY } from "@excalidraw/common";
import { convertToExcalidrawElements, getCommonBounds, setCustomTextMetricsProvider, syncInvalidIndices } from "@excalidraw/element";
import { createCanvas, GlobalFonts } from "@napi-rs/canvas";
import { assertCan } from "../authorization/authorization.utils.js";
import type { CollabService } from "../collab/collab.type.js";
import { orderedElements } from "../collab/collab.utils.js";
import type { SceneElement, ScenesService } from "../scenes/scenes.type.js";
import { ARROW_GAP, EDITOR_FONT_FOLDERS, EMPTY_SCENE_ORIGIN, LAYOUT_LIMIT, PLACEMENT_GAP, RAW_ELEMENTS_MAX } from "./elements.const.js";
import type { Box, ElementsService, Skeleton } from "./elements.type.js";
import {
  arrowBetween,
  fontWithAliases,
  isShape,
  placeInLayers,
  resolveReferences,
  SkeletonIdTaken,
  SkeletonNeedsPosition,
  SkeletonsTooWide,
  summarizeScene,
  unionBox,
  withIds,
} from "./elements.utils.js";

type Converted = ReturnType<typeof convertToExcalidrawElements>;

export function editorFontsDir(): string {
  const bundled = fileURLToPath(new URL("fonts", import.meta.url));
  return existsSync(bundled) ? bundled : join(dirname(createRequire(import.meta.url).resolve("@excalidraw/excalidraw")), "fonts");
}

const registered = new Map<string, Map<string, string[]>>();

function registerFonts(fontsDir: string): Map<string, string[]> {
  const known = registered.get(fontsDir);
  if (known) return known;
  const aliases = new Map<string, string[]>();
  for (const [family, folder] of Object.entries(EDITOR_FONT_FOLDERS)) {
    const files = readdirSync(join(fontsDir, folder)).filter((file) => file.endsWith(".woff2") && !/-(Bold|Medium|SemiBold)\./.test(file));
    aliases.set(
      family,
      files.map((file, index) => {
        const alias = `editor ${family} ${index}`;
        GlobalFonts.registerFromPath(join(fontsDir, folder, file), alias);
        return alias;
      }),
    );
  }
  registered.set(fontsDir, aliases);
  return aliases;
}

function convertInNode(skeletons: readonly object[]): Converted {
  const scope = globalThis as { window?: unknown };
  const had = "window" in scope;
  const previous = scope.window;
  scope.window = {};
  try {
    return convertToExcalidrawElements(skeletons as never, { regenerateIds: false });
  } finally {
    if (had) scope.window = previous;
    else delete scope.window;
  }
}

function upstreamSkeleton(skeleton: Skeleton): object {
  const fontOf = (name?: keyof typeof FONT_FAMILY) => (name ? FONT_FAMILY[name] : undefined);
  if (skeleton.type === "text") return { ...skeleton, fontFamily: fontOf(skeleton.fontFamily) };
  if (skeleton.type === "frame") return skeleton;
  return skeleton.label ? { ...skeleton, label: { ...skeleton.label, fontFamily: fontOf(skeleton.label.fontFamily) } } : skeleton;
}

function boxOf(element: { x: number; y: number; width: number; height: number }): Box {
  return { x: element.x, y: element.y, width: element.width, height: element.height };
}

function drawnBox(elements: readonly SceneElement[]): Box | undefined {
  return unionBox(
    elements.map((element) => {
      try {
        const [minX, minY, maxX, maxY] = getCommonBounds([element] as never);
        return [minX, minY, maxX, maxY].every(Number.isFinite) ? { x: minX, y: minY, width: maxX - minX, height: maxY - minY } : undefined;
      } catch {
        return undefined;
      }
    }),
  );
}

export function createElementsService(options: {
  collab: Pick<CollabService, "edit">;
  scenes: Pick<ScenesService, "get">;
  fontsDir: string;
  generateId?: () => string;
}): ElementsService {
  const { collab, scenes, fontsDir } = options;
  const generateId = options.generateId ?? randomUUID;
  const aliases = registerFonts(fontsDir);
  const context = createCanvas(1, 1).getContext("2d");
  const fonts = new Map<string, string>();
  let currentFont = "";
  setCustomTextMetricsProvider({
    getLineWidth: (text, font) => {
      if (font !== currentFont) {
        let css = fonts.get(font);
        if (css === undefined) {
          css = fontWithAliases(font, aliases);
          fonts.set(font, css);
        }
        context.font = css;
        currentFont = font;
      }
      return context.measureText(text).width;
    },
  });

  const layOut = (skeletons: readonly Skeleton[], existing: Box | undefined): Skeleton[] => {
    const shapes = skeletons.filter(isShape);
    const sized = new Map(
      convertInNode(shapes.map((shape) => upstreamSkeleton({ ...shape, x: shape.x ?? 0, y: shape.y ?? 0 }))).map((element) => [
        element.id,
        boxOf(element),
      ]),
    );
    const positioned = shapes.filter((shape) => shape.x !== undefined && shape.y !== undefined);
    const unplaced = shapes.filter((shape) => shape.x === undefined);
    const edges = skeletons.flatMap((skeleton): [string, string][] =>
      (skeleton.type === "arrow" || skeleton.type === "line") && skeleton.start && "id" in skeleton.start && skeleton.end && "id" in skeleton.end
        ? [[skeleton.start.id, skeleton.end.id]]
        : [],
    );
    const frames = skeletons.flatMap((skeleton) => (skeleton.type === "frame" ? [new Set(skeleton.children)] : []));
    const groups = [unplaced.filter((shape) => !frames.some((frame) => frame.has(shape.id!))), ...frames.map((frame) => unplaced.filter((shape) => frame.has(shape.id!)))];
    const places = new Map<string, { x: number; y: number }>();
    let beside = unionBox([existing, ...positioned.map((shape) => sized.get(shape.id!))]);
    for (const group of groups.filter((members) => members.length > 0)) {
      const sizes = group.map((shape) => ({ id: shape.id!, ...sized.get(shape.id!)! }));
      const placed = placeInLayers(sizes, edges, beside, PLACEMENT_GAP, EMPTY_SCENE_ORIGIN);
      for (const [id, place] of placed) places.set(id, place);
      beside = unionBox([beside, ...sizes.map((size) => ({ ...size, ...placed.get(size.id)! }))]);
    }
    const boxes = new Map(shapes.map((shape) => [shape.id!, { ...sized.get(shape.id!)!, ...places.get(shape.id!) }]));
    if ([...boxes.values()].some((box) => box.x + box.width > LAYOUT_LIMIT)) throw new SkeletonsTooWide();
    return skeletons.map((skeleton, index) => {
      if (skeleton.type === "frame") return skeleton;
      if (isShape(skeleton)) return { ...skeleton, ...places.get(skeleton.id!) };
      if (skeleton.x !== undefined && skeleton.y !== undefined) return skeleton;
      const start = skeleton.start && "id" in skeleton.start ? boxes.get(skeleton.start.id) : undefined;
      const end = skeleton.end && "id" in skeleton.end ? boxes.get(skeleton.end.id) : undefined;
      if (!start || !end) throw new SkeletonNeedsPosition(index);
      return { ...skeleton, ...arrowBetween(start, end, ARROW_GAP) };
    });
  };

  return {
    describe: async (actor, sceneId, { includeElements }) => {
      const live = (await scenes.get(actor, sceneId)).elements.filter((element) => !element.isDeleted);
      const summary = summarizeScene(live, drawnBox(live));
      if (!includeElements) return summary;
      return { ...summary, elements: live.slice(0, RAW_ELEMENTS_MAX), elementsTruncated: live.length > RAW_ELEMENTS_MAX };
    },

    addSkeletons: async (actor, sceneId, input) => {
      assertCan(actor, "scene.edit");
      const skeletons = resolveReferences(withIds(input, generateId));
      let elementIds: string[] = [];
      const applied = await collab.edit(actor, sceneId, (current) => {
        const taken = skeletons.find((skeleton) => skeleton.id && current.has(skeleton.id));
        if (taken) throw new SkeletonIdTaken(taken.id!);
        const existing = drawnBox([...current.values()].filter((element) => !element.isDeleted));
        const created = convertInNode(layOut(skeletons, existing).map(upstreamSkeleton)).map((element) => ({ ...element, index: null }));
        const ordered = syncInvalidIndices([...orderedElements(current).map((element) => ({ ...element })), ...created] as never) as unknown as SceneElement[];
        const createdIds = new Set(created.map(({ id }) => id));
        const upsert = ordered.filter((element) => createdIds.has(element.id));
        elementIds = upsert.map(({ id }) => id);
        return { upsert, delete: [] };
      });
      return { version: applied.version, elementIds };
    },
  };
}
