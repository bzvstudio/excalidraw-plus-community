import type { SceneElement } from "../scenes/scenes.type.js";
import { SUMMARY_LIMITS } from "./elements.const.js";
import type { Box, SceneSummaryView, ShapeSkeleton, Skeleton } from "./elements.type.js";

export class SkeletonEndUnknown extends Error {
  constructor(index: number, end: "start" | "end") {
    super(`skeletons.${index}.${end}: name a shape in this request, by its id or its label`);
  }
}

export class SkeletonNeedsPosition extends Error {
  constructor(index: number) {
    super(`skeletons.${index}: give x and y, or both a start and an end`);
  }
}

export class SkeletonIdTaken extends Error {
  constructor(id: string) {
    super(`The id ${id} is taken by an element in the scene, or one deleted from it; leave the id out or use another`);
  }
}

export class SkeletonLabelAmbiguous extends Error {
  constructor(index: number, end: "start" | "end", label: string) {
    super(`skeletons.${index}.${end}: more than one shape is labelled "${label}"; name it by its id`);
  }
}

export class SkeletonEndsSame extends Error {
  constructor(index: number) {
    super(`skeletons.${index}: start and end name the same shape`);
  }
}

export class SkeletonChildUnknown extends Error {
  constructor(index: number, child: number) {
    super(`skeletons.${index}.children.${child}: name an element in this request, other than a frame, that no other frame holds`);
  }
}

export class SkeletonsTooWide extends Error {
  constructor() {
    super("There is no room left beside this scene's drawing; give the shapes x and y");
  }
}

export function isShape(skeleton: Skeleton): skeleton is ShapeSkeleton {
  return skeleton.type !== "arrow" && skeleton.type !== "line" && skeleton.type !== "frame";
}

export function fontWithAliases(font: string, aliases: ReadonlyMap<string, readonly string[]>): string {
  const [size, ...rest] = font.split(" ");
  const families = rest
    .join(" ")
    .split(",")
    .map((family) => family.trim().replace(/^"|"$/g, ""))
    .flatMap((family) => aliases.get(family) ?? [])
    .map((alias) => `"${alias}"`);
  return `${size} ${families.join(", ") || "sans-serif"}`;
}

export function withIds(skeletons: readonly Skeleton[], newId: () => string): Skeleton[] {
  return skeletons.map((skeleton) => (skeleton.id ? skeleton : { ...skeleton, id: newId() }));
}

export function resolveReferences(skeletons: readonly Skeleton[]): Skeleton[] {
  const byLabel = new Map<string, string[]>();
  for (const skeleton of skeletons) {
    if (!isShape(skeleton) || !skeleton.id) continue;
    const text = skeleton.type === "text" ? skeleton.text : skeleton.label?.text;
    if (text !== undefined) byLabel.set(text, [...(byLabel.get(text) ?? []), skeleton.id]);
  }
  const shapes = new Set(skeletons.flatMap((skeleton) => (isShape(skeleton) && skeleton.id ? [skeleton.id] : [])));
  const framable = new Set(skeletons.flatMap((skeleton) => (skeleton.type !== "frame" && skeleton.id ? [skeleton.id] : [])));
  const framed = new Set<string>();
  return skeletons.map((skeleton, index) => {
    if (skeleton.type === "frame") {
      skeleton.children.forEach((child, childIndex) => {
        if (!framable.has(child) || framed.has(child)) throw new SkeletonChildUnknown(index, childIndex);
        framed.add(child);
      });
      return skeleton;
    }
    if (skeleton.type !== "arrow" && skeleton.type !== "line") return skeleton;
    const resolve = (end: typeof skeleton.start, which: "start" | "end") => {
      if (!end) return undefined;
      if ("label" in end) {
        const matches = byLabel.get(end.label) ?? [];
        if (matches.length > 1) throw new SkeletonLabelAmbiguous(index, which, end.label);
        if (matches.length === 0) throw new SkeletonEndUnknown(index, which);
        return { id: matches[0]! };
      }
      if (!shapes.has(end.id)) throw new SkeletonEndUnknown(index, which);
      return { id: end.id };
    };
    const start = resolve(skeleton.start, "start");
    const end = resolve(skeleton.end, "end");
    if (start && end && start.id === end.id) throw new SkeletonEndsSame(index);
    return { ...skeleton, start, end };
  });
}

export function unionBox(boxes: readonly (Box | undefined)[]): Box | undefined {
  const present = boxes.filter((box) => box !== undefined);
  if (present.length === 0) return undefined;
  const minX = Math.min(...present.map((box) => box.x));
  const minY = Math.min(...present.map((box) => box.y));
  const maxX = Math.max(...present.map((box) => box.x + box.width));
  const maxY = Math.max(...present.map((box) => box.y + box.height));
  return { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
}

function forwardEdges(ids: readonly string[], edges: readonly [string, string][]): [string, string][] {
  const out = new Map<string, string[]>();
  for (const [from, to] of edges) out.set(from, [...(out.get(from) ?? []), to]);
  const state = new Map<string, "open" | "done">();
  const kept: [string, string][] = [];
  const visit = (id: string) => {
    state.set(id, "open");
    for (const to of out.get(id) ?? []) {
      if (state.get(to) === "open") continue;
      kept.push([id, to]);
      if (!state.has(to)) visit(to);
    }
    state.set(id, "done");
  };
  for (const id of ids) if (!state.has(id)) visit(id);
  return kept;
}

function ranksOf(ids: readonly string[], all: readonly [string, string][]): Map<string, number> {
  const edges = forwardEdges(ids, all);
  const rank = new Map<string, number>();
  const connected = new Set(all.flat());
  for (const id of ids) if (connected.has(id)) rank.set(id, 0);
  for (let round = 0; round < ids.length; round += 1) {
    let changed = false;
    for (const [from, to] of edges) {
      const next = (rank.get(from) ?? 0) + 1;
      if (next > (rank.get(to) ?? 0) && next < ids.length) {
        rank.set(to, next);
        changed = true;
      }
    }
    if (!changed) break;
  }
  return rank;
}

export function placeInLayers(
  sizes: readonly { id: string; width: number; height: number }[],
  edges: readonly [string, string][],
  beside: Box | undefined,
  gap: number,
  origin: { x: number; y: number },
): Map<string, { x: number; y: number }> {
  const ids = sizes.map(({ id }) => id);
  const known = new Set(ids);
  const ranks = ranksOf(ids, edges.filter(([from, to]) => known.has(from) && known.has(to) && from !== to));
  const layered = Math.max(-1, ...ranks.values()) + 1;
  let isolated = layered;
  const columns: (typeof sizes)[number][][] = [];
  for (const size of sizes) {
    const column = ranks.get(size.id) ?? isolated++;
    (columns[column] ??= []).push(size);
  }
  const top = beside ? beside.y : origin.y;
  let x = beside ? beside.x + beside.width + gap : origin.x;
  const placed = new Map<string, { x: number; y: number }>();
  for (const column of columns) {
    if (!column) continue;
    let y = top;
    for (const size of column) {
      placed.set(size.id, { x, y });
      y += size.height + gap / 2;
    }
    x += Math.max(...column.map(({ width }) => width)) + gap;
  }
  return placed;
}

function edgePoint(box: Box, toward: { x: number; y: number }, gap: number) {
  const cx = box.x + box.width / 2;
  const cy = box.y + box.height / 2;
  const dx = toward.x - cx;
  const dy = toward.y - cy;
  if (dx === 0 && dy === 0) return { x: cx, y: cy };
  const scale = Math.min(dx === 0 ? Infinity : box.width / 2 / Math.abs(dx), dy === 0 ? Infinity : box.height / 2 / Math.abs(dy));
  const distance = Math.hypot(dx, dy);
  const reach = Math.min(1, scale + gap / distance);
  return { x: cx + dx * reach, y: cy + dy * reach };
}

export function arrowBetween(start: Box, end: Box, gap: number) {
  const startCenter = { x: start.x + start.width / 2, y: start.y + start.height / 2 };
  const endCenter = { x: end.x + end.width / 2, y: end.y + end.height / 2 };
  const from = edgePoint(start, endCenter, gap);
  const to = edgePoint(end, startCenter, gap);
  return { x: from.x, y: from.y, points: [[0, 0], [to.x - from.x, to.y - from.y]] as [number, number][] };
}

type Drawn = SceneElement & {
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  text?: string;
  name?: string | null;
  containerId?: string | null;
  frameId?: string | null;
  startBinding?: { elementId: string } | null;
  endBinding?: { elementId: string } | null;
};

function clip(text: string): string {
  return text.length > SUMMARY_LIMITS.text ? `${text.slice(0, SUMMARY_LIMITS.text)}…` : text;
}

function rounded(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value) ? Math.round(value) : 0;
}

export function summarizeScene(elements: readonly SceneElement[], bounds: Box | undefined): SceneSummaryView {
  const live = (elements as readonly Drawn[]).filter((element) => !element.isDeleted);
  const kinds = new Map(live.map((element) => [element.id, element.type]));
  const isFrame = (id: string | null | undefined) => !!id && (kinds.get(id) === "frame" || kinds.get(id) === "magicframe");
  const isBindable = (id: string | null | undefined) => !!id && kinds.has(id) && !["arrow", "line", "frame", "magicframe"].includes(kinds.get(id)!);
  const labels = new Map(
    live.flatMap((element) =>
      element.type === "text" && element.containerId && kinds.has(element.containerId) && typeof element.text === "string"
        ? [[element.containerId, clip(element.text)]]
        : [],
    ),
  );
  const frameOf = (element: Drawn) => (isFrame(element.frameId) ? { frameId: element.frameId! } : {});
  const children = new Map<string, number>();
  for (const element of live) if (isFrame(element.frameId)) children.set(element.frameId!, (children.get(element.frameId!) ?? 0) + 1);
  const labelOf = (element: Drawn) => (labels.has(element.id) ? { label: labels.get(element.id)! } : {});
  const frames = live.filter((element) => element.type === "frame" || element.type === "magicframe");
  const linear = live.filter((element) => element.type === "arrow" || element.type === "line");
  const texts = live.filter((element) => element.type === "text" && !element.containerId);
  const shapes = live.filter((element) => !["frame", "magicframe", "arrow", "line", "text"].includes(element.type));
  const limited = <Item>(items: Item[]) => items.slice(0, SUMMARY_LIMITS.items);
  return {
    elementCount: live.length,
    bounds: bounds ? { x: Math.round(bounds.x), y: Math.round(bounds.y), width: Math.round(bounds.width), height: Math.round(bounds.height) } : null,
    frames: limited(frames).map((frame) => ({
      id: frame.id,
      name: typeof frame.name === "string" ? clip(frame.name) : null,
      children: children.get(frame.id) ?? 0,
    })),
    shapes: limited(shapes).map((shape) => ({
      id: shape.id,
      type: shape.type,
      ...labelOf(shape),
      x: rounded(shape.x),
      y: rounded(shape.y),
      width: rounded(shape.width),
      height: rounded(shape.height),
      ...frameOf(shape),
    })),
    texts: limited(texts).map((text) => ({ id: text.id, text: clip(String(text.text ?? "")), x: rounded(text.x), y: rounded(text.y), ...frameOf(text) })),
    arrows: limited(linear).map((arrow) => ({
      id: arrow.id,
      type: arrow.type,
      ...(isBindable(arrow.startBinding?.elementId) ? { from: arrow.startBinding!.elementId } : {}),
      ...(isBindable(arrow.endBinding?.elementId) ? { to: arrow.endBinding!.elementId } : {}),
      ...labelOf(arrow),
    })),
    truncated: [frames, shapes, texts, linear].some((items) => items.length > SUMMARY_LIMITS.items),
  };
}
