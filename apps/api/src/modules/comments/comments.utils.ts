import type { CommentThreadRow } from "@repo/db";
import type { SceneElement } from "../scenes/scenes.type.js";
import { COMMENT_SEAL_KIND } from "./comments.const.js";
import type { CommentAnchor, CommentAuthorship, Commenter } from "./comments.type.js";

export class UnknownThread extends Error {
  constructor() {
    super("This thread no longer exists");
  }
}

export class UnknownComment extends Error {
  constructor() {
    super("This comment no longer exists");
  }
}

export class CommentDenied extends Error {
  constructor(action: string) {
    super(`You cannot ${action}`);
  }
}

export function canPost(commenter: Commenter): boolean {
  return commenter.via === "membership" || commenter.access === "edit";
}

export function canResolve(commenter: Commenter): boolean {
  return commenter.access === "edit";
}

export function wrote(commenter: Commenter, comment: CommentAuthorship): boolean {
  return "userId" in commenter.author
    ? comment.authorId === commenter.author.userId
    : comment.guestId === commenter.author.guestId;
}

export function canEdit(commenter: Commenter, comment: CommentAuthorship): boolean {
  return canPost(commenter) && wrote(commenter, comment);
}

export function canDelete(commenter: Commenter, comment: CommentAuthorship): boolean {
  return canEdit(commenter, comment) || commenter.isAdmin;
}

export function commentSealContext(threadId: string, commentId: string) {
  return { kind: COMMENT_SEAL_KIND, id: `${threadId}/${commentId}` };
}

export type ScenePoint = { x: number; y: number };

type Box = { x: number; y: number; width: number; height: number; angle: number };

const ANCHORED_SHAPES = ["rectangle", "diamond", "ellipse", "text", "image", "embeddable", "iframe"];

const ANCHORED_FRAMES = ["frame", "magicframe"];

function numberOf(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function boxOf(element: SceneElement): Box {
  return {
    x: numberOf(element.x),
    y: numberOf(element.y),
    width: numberOf(element.width),
    height: numberOf(element.height),
    angle: numberOf(element.angle),
  };
}

function turned(point: ScenePoint, box: Box, angle: number): ScenePoint {
  const centre = { x: box.x + box.width / 2, y: box.y + box.height / 2 };
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  const dx = point.x - centre.x;
  const dy = point.y - centre.y;
  return { x: centre.x + dx * cos - dy * sin, y: centre.y + dx * sin + dy * cos };
}

function share(value: number, size: number): number {
  return size > 0 ? Math.min(Math.max(value / size, 0), 1) : 0;
}

export function anchorAt(point: ScenePoint, elements: readonly SceneElement[]): CommentAnchor {
  const under = elements
    .filter((element) => {
      if (element.isDeleted) return false;
      const box = boxOf(element);
      const local = turned(point, box, -box.angle);
      return local.x >= box.x && local.x <= box.x + box.width && local.y >= box.y && local.y <= box.y + box.height;
    })
    .reverse();
  const target =
    under.find((element) => ANCHORED_SHAPES.includes(element.type)) ??
    under.find((element) => ANCHORED_FRAMES.includes(element.type));
  if (!target) return { x: point.x, y: point.y };
  const box = boxOf(target);
  const local = turned(point, box, -box.angle);
  return {
    x: point.x,
    y: point.y,
    elementId: target.id,
    offsetX: share(local.x - box.x, box.width),
    offsetY: share(local.y - box.y, box.height),
  };
}

export function anchorPoint(anchor: CommentAnchor, elements: ReadonlyMap<string, SceneElement>): ScenePoint {
  const element = "elementId" in anchor ? elements.get(anchor.elementId) : undefined;
  if (!element || !("elementId" in anchor)) return { x: anchor.x, y: anchor.y };
  const box = boxOf(element);
  return turned({ x: box.x + anchor.offsetX * box.width, y: box.y + anchor.offsetY * box.height }, box, box.angle);
}

export function anchorOf(thread: Pick<CommentThreadRow, "x" | "y" | "elementId" | "offsetX" | "offsetY">): CommentAnchor {
  if (thread.elementId === null || thread.offsetX === null || thread.offsetY === null) return { x: thread.x, y: thread.y };
  return { x: thread.x, y: thread.y, elementId: thread.elementId, offsetX: thread.offsetX, offsetY: thread.offsetY };
}

export function anchorColumns(anchor: CommentAnchor) {
  return "elementId" in anchor
    ? { x: anchor.x, y: anchor.y, elementId: anchor.elementId, offsetX: anchor.offsetX, offsetY: anchor.offsetY }
    : { x: anchor.x, y: anchor.y, elementId: null, offsetX: null, offsetY: null };
}
