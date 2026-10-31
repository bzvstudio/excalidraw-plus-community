import { createHash } from "node:crypto";
import type { Seat } from "../collab/collab.type.js";
import { CALL_ROOM_PREFIX, LIVEKIT_CLOUD_ORIGINS } from "./calls.const.js";

export class CallsUnavailable extends Error {
  constructor() {
    super("Calls are not set up on this server");
  }
}

export class TooManyCallJoins extends Error {
  constructor() {
    super("Too many attempts to join the call. Wait a moment and try again.");
  }
}

export function callRoomPrefixFor(publicBaseUrl: string): string {
  return `${createHash("sha256").update(publicBaseUrl).digest("hex").slice(0, 8)}-${CALL_ROOM_PREFIX}`;
}

export function callRoomOf(prefix: string, sceneId: string): string {
  return `${prefix}${sceneId}`;
}

export function sceneIdOfRoom(prefix: string, room: string): string | undefined {
  return room.startsWith(prefix) ? room.slice(prefix.length) : undefined;
}

export function callerOf(seat: Seat): string {
  if (seat.kind === "member") return `user:${seat.userId}`;
  return seat.visitor ? `guest:${seat.visitor.guestId}` : `link:${seat.linkId}`;
}

export function callOrigins(url: string): string[] {
  const { host, protocol } = new URL(url);
  const secure = protocol === "wss:" || protocol === "https:";
  const origins = [`${secure ? "wss" : "ws"}://${host}`, `${secure ? "https" : "http"}://${host}`];
  return host.endsWith(".livekit.cloud") ? [...origins, ...LIVEKIT_CLOUD_ORIGINS] : origins;
}
