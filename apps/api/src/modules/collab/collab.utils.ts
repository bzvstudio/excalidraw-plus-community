import { UnknownShareLink, ShareLinkExpired, ShareLinkRevoked } from "../sharing/sharing.utils.js";
import { WorkspaceAccessDenied } from "../authorization/authorization.utils.js";
import { compareByIndex, keepsStoredElement, UnknownScene } from "../scenes/scenes.utils.js";
import type { SceneAppState, SceneElement, SceneLimits } from "../scenes/scenes.type.js";
import { UnknownWorkspace } from "../workspaces/workspaces.utils.js";
import type { Connected, JoinRequest, Room, SceneEdits, Seat } from "./collab.type.js";

export class NotInRoom extends Error {
  constructor() {
    super("Join the scene before sending changes to it");
  }
}

export class SceneNotSaved extends Error {
  constructor() {
    super("The change reached the scene but could not be saved yet; it will be saved shortly");
  }
}

export class CollabClosing extends Error {
  constructor() {
    super("The server is restarting; changes will be sent again once it is back");
  }
}

export function seatFor(request: JoinRequest, connected: Connected): Seat | undefined {
  if ("linkId" in request) return { kind: "link", linkId: request.linkId, ...connected };
  if (!connected.principal || !connected.session) return undefined;
  return {
    kind: "member",
    userId: connected.principal.userId,
    name: connected.principal.name,
    avatarId: connected.principal.avatarId,
    workspaceId: request.workspaceId,
    sceneId: request.sceneId,
    session: connected.session,
  };
}

export function createRateLimit(burst: number, perSecond: number, now: () => number = Date.now) {
  let tokens = burst;
  let refilledAt = now();
  return () => {
    const at = now();
    tokens = Math.min(burst, tokens + ((at - refilledAt) / 1000) * perSecond);
    refilledAt = at;
    if (tokens < 1) return false;
    tokens -= 1;
    return true;
  };
}

export function followsBack(participants: ReadonlyMap<string, { following?: string }>, from: string, to: string) {
  const seen = new Set<string>();
  for (let next: string | undefined = to; next !== undefined && !seen.has(next); next = participants.get(next)?.following) {
    if (next === from) return true;
    seen.add(next);
  }
  return false;
}

export function losesAccess(error: unknown): boolean {
  return [UnknownWorkspace, UnknownScene, UnknownShareLink, ShareLinkRevoked, ShareLinkExpired, WorkspaceAccessDenied].some(
    (refusal) => error instanceof refusal,
  );
}

export function elementBytes(element: SceneElement): number {
  return Buffer.byteLength(JSON.stringify(element));
}

export function newerElements(
  current: ReadonlyMap<string, SceneElement>,
  incoming: readonly SceneElement[],
): Map<string, SceneElement> {
  const newer = new Map<string, SceneElement>();
  for (const element of incoming) {
    const known = newer.get(element.id) ?? current.get(element.id);
    if (!known || !keepsStoredElement(known, element)) newer.set(element.id, element);
  }
  return newer;
}

export function changedAppState(current: SceneAppState, incoming: SceneAppState): boolean {
  return Object.entries(incoming).some(([key, value]) => current[key as keyof SceneAppState] !== value);
}

export function fitsLimitsWith(
  room: Pick<Room, "elements" | "bytes" | "totalBytes" | "appState">,
  newer: ReadonlyMap<string, SceneElement>,
  appState: SceneAppState,
  limits: SceneLimits,
): boolean {
  let count = room.elements.size;
  let elementsBytes = room.totalBytes;
  for (const [id, element] of newer) {
    if (!room.elements.has(id)) count += 1;
    elementsBytes += elementBytes(element) - (room.bytes.get(id) ?? 0);
  }
  const envelope = Buffer.byteLength(JSON.stringify({ elements: [], appState: { ...room.appState, ...appState } }));
  return count <= limits.maxElements && elementsBytes + Math.max(count - 1, 0) + envelope <= limits.maxBytes;
}

export function orderedElements(elements: ReadonlyMap<string, SceneElement>): SceneElement[] {
  return [...elements.values()].sort(compareByIndex);
}

export function bumpedEdits(
  current: ReadonlyMap<string, SceneElement>,
  edits: SceneEdits,
  updated: number,
  nonce: () => number,
): Map<string, SceneElement> {
  const bumped = new Map<string, SceneElement>();
  for (const element of edits.upsert) {
    if (element.isDeleted) continue;
    const known = bumped.get(element.id) ?? current.get(element.id);
    bumped.set(element.id, { ...element, isDeleted: false, version: (known?.version ?? 0) + 1, versionNonce: nonce(), updated });
  }
  for (const id of [...edits.delete, ...edits.upsert.filter((element) => element.isDeleted).map(({ id }) => id)]) {
    const known = bumped.get(id) ?? current.get(id);
    if (!known || known.isDeleted) continue;
    bumped.set(id, { ...known, isDeleted: true, version: known.version + 1, versionNonce: nonce(), updated });
  }
  return bumped;
}
