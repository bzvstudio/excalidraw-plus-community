import { gunzipSync, gzipSync } from "node:zlib";
import type { SceneRow } from "@repo/db";
import type { Sealer } from "../encryption/encryption.type.js";
import { CannotDecrypt } from "../encryption/encryption.utils.js";
import type { Actor } from "../authorization/authorization.type.js";
import { actorCan, can, isApiKey } from "../authorization/authorization.utils.js";
import { BYTES_PER_MB } from "../system/system.const.js";
import { DELETED_ELEMENT_RETENTION_MS, SCENE_APP_STATE_KEYS, SCENE_SEAL_KIND } from "./scenes.const.js";
import type {
  SceneAppState,
  SceneContent,
  SceneElement,
  SceneLimits,
  SceneListItem,
  SceneSummary,
} from "./scenes.type.js";

export class UnknownScene extends Error {
  constructor() {
    super("No such scene");
  }
}

export class SceneTooLarge extends Error {
  constructor(limits: SceneLimits) {
    super(
      `This scene has grown past what the server stores (${limits.maxElements.toLocaleString("en")} elements or ${Math.round(limits.maxBytes / BYTES_PER_MB)} MB). Split it into several scenes.`,
    );
  }
}

export class SceneDeleteDenied extends Error {
  constructor() {
    super("Only the person who created a scene, or an admin, can delete it");
  }
}

export class SceneNeedsCollection extends Error {
  constructor() {
    super("An API key can only create scenes in a collection open to the whole workspace; give collectionId");
  }
}

export class InvalidSceneCursor extends Error {
  constructor() {
    super("This cursor is not one the scene list gave out; start again without it");
  }
}

export class SceneMoveDenied extends Error {
  constructor() {
    super("Only an admin can move a scene out of a collection restricted to teams");
  }
}

export class SceneDraftDenied extends Error {
  constructor() {
    super("Only the person who created a scene, or an admin, can move it back to drafts");
  }
}

export function keepsStoredElement(stored: SceneElement, incoming: SceneElement): boolean {
  return (
    stored.version > incoming.version ||
    (stored.version === incoming.version && stored.versionNonce <= incoming.versionNonce)
  );
}

function hasIndex(element: SceneElement): element is SceneElement & { index: string } {
  return typeof element.index === "string";
}

export function compareByIndex(a: SceneElement, b: SceneElement): number {
  if (hasIndex(a) !== hasIndex(b)) return hasIndex(a) ? -1 : 1;
  if (hasIndex(a) && hasIndex(b) && a.index !== b.index) return a.index < b.index ? -1 : 1;
  return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
}

export function isExpiredTombstone(element: SceneElement, now: number): boolean {
  return element.isDeleted && typeof element.updated === "number" && element.updated <= now - DELETED_ELEMENT_RETENTION_MS;
}

export function mergeElements(
  stored: readonly SceneElement[],
  incoming: readonly SceneElement[],
  now: number,
): SceneElement[] {
  const merged = new Map(stored.map((element) => [element.id, element]));
  for (const element of incoming) {
    const current = merged.get(element.id);
    if (!current || !keepsStoredElement(current, element)) merged.set(element.id, element);
  }
  return [...merged.values()].filter((element) => !isExpiredTombstone(element, now)).sort(compareByIndex);
}

export function mayDeleteScene(actor: Actor, createdBy: string | null): boolean {
  if (isApiKey(actor)) return actorCan(actor, "scene.edit");
  return createdBy === actor.userId || can(actor.role, "workspace.manage");
}

export function authorOf(actor: Actor): string | null {
  return isApiKey(actor) ? null : actor.userId;
}

export function pickSceneAppState(appState: SceneAppState): SceneAppState {
  return Object.fromEntries(
    SCENE_APP_STATE_KEYS.filter((key) => appState[key] !== undefined).map((key) => [key, appState[key]]),
  );
}

export function encodeContent(content: SceneContent): Buffer {
  return gzipSync(Buffer.from(JSON.stringify(content)));
}

export function decodeContent(bytes: Buffer): SceneContent {
  return JSON.parse(gunzipSync(bytes).toString("utf8")) as SceneContent;
}

export function sceneSealContext(sceneId: string) {
  return { kind: SCENE_SEAL_KIND, id: sceneId };
}

export function sealContent(sealer: Sealer, sceneId: string, content: SceneContent) {
  const { bytes, keyId } = sealer.seal(encodeContent(content), sceneSealContext(sceneId));
  return { content: bytes, contentKeyId: keyId };
}

export function openContent(sealer: Sealer, row: Pick<SceneRow, "id" | "content" | "contentKeyId">): SceneContent {
  if (row.contentKeyId === null) {
    throw new CannotDecrypt("it was stored before encryption at rest, and must be encrypted with the reseal command first");
  }
  return decodeContent(sealer.open(row.content, sceneSealContext(row.id)));
}

export function adoptContent(sealer: Sealer, row: Pick<SceneRow, "id" | "content" | "contentKeyId">): SceneContent {
  return row.contentKeyId === null ? decodeContent(row.content) : openContent(sealer, row);
}

export function contentSize(content: SceneContent): number {
  return Buffer.byteLength(JSON.stringify(content));
}

export function fitsLimits(content: SceneContent, limits: SceneLimits): boolean {
  return content.elements.length <= limits.maxElements && contentSize(content) <= limits.maxBytes;
}

export function toSceneSummary(
  actor: Actor,
  row: Pick<
    SceneRow,
    "id" | "collectionId" | "title" | "version" | "createdBy" | "updatedBy" | "createdAt" | "updatedAt"
  >,
): SceneSummary {
  return {
    id: row.id,
    collectionId: row.collectionId,
    canDelete: actorCan(actor, "scene.edit") && mayDeleteScene(actor, row.createdBy),
    title: row.title,
    version: row.version,
    createdBy: row.createdBy,
    updatedBy: row.updatedBy,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export function toSceneListItem(
  actor: Actor,
  row: Parameters<typeof toSceneSummary>[1] & Pick<SceneListItem, "createdByName" | "updatedByName" | "updatedByAvatarId" | "thumbnailUpdatedAt">,
): SceneListItem {
  return {
    ...toSceneSummary(actor, row),
    createdByName: row.createdByName,
    updatedByName: row.updatedByName,
    updatedByAvatarId: row.updatedByAvatarId,
    thumbnailUpdatedAt: row.thumbnailUpdatedAt,
  };
}

function cursorOf(item: { id: string; updatedAt: Date }): string {
  return Buffer.from(`${item.updatedAt.toISOString()}|${item.id}`).toString("base64url");
}

function isAfter(item: { id: string; updatedAt: Date }, cursor: { id: string; updatedAt: number }): boolean {
  const at = item.updatedAt.getTime();
  return at < cursor.updatedAt || (at === cursor.updatedAt && item.id < cursor.id);
}

export function pageOf<Item extends { id: string; updatedAt: Date }>(
  items: readonly Item[],
  { cursor, limit }: { cursor?: string; limit: number },
): { items: Item[]; nextCursor: string | null } {
  const ordered = [...items].sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime() || (a.id < b.id ? 1 : a.id > b.id ? -1 : 0));
  let after = ordered;
  if (cursor) {
    const [updatedAt, id] = Buffer.from(cursor, "base64url").toString("utf8").split("|");
    const at = Date.parse(updatedAt ?? "");
    if (!id || Number.isNaN(at)) throw new InvalidSceneCursor();
    after = ordered.filter((item) => isAfter(item, { id, updatedAt: at }));
  }
  const page = after.slice(0, limit);
  return { items: page, nextCursor: after.length > limit ? cursorOf(page.at(-1)!) : null };
}

export function withoutGeneratedPage<Element extends Record<string, unknown>>(element: Element): Element {
  const { customData } = element;
  if (typeof customData !== "object" || customData === null || !Object.hasOwn(customData, "generationData")) return element;
  return { ...element, customData: Object.fromEntries(Object.entries(customData).filter(([key]) => key !== "generationData")) };
}
