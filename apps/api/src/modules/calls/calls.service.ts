import { randomUUID } from "node:crypto";
import { createAccessChangeLog } from "../access/access.utils.js";
import { createRateLimit } from "../collab/collab.utils.js";
import type { Seat, SeatAccess, SeatAccessCheck } from "../collab/collab.type.js";
import { UnknownScene } from "../scenes/scenes.utils.js";
import { CALL_JOIN_RATE, CALL_RECORD_GRACE_MS, CALL_TOKEN_TTL_SECONDS } from "./calls.const.js";
import type { CallRooms, CallsService } from "./calls.type.js";
import { callerOf, callRoomOf, CallsUnavailable, sceneIdOfRoom, TooManyCallJoins } from "./calls.utils.js";

type IssuedSeat = {
  seat: Seat;
  sceneId: string;
  workspaceId: string;
  seenAt: number;
};

export function createCallsService(options: {
  rooms?: CallRooms;
  url?: string;
  roomPrefix: string;
  seatAccess: SeatAccessCheck;
  log: (line: string) => void;
  now?: () => number;
  generateId?: () => string;
}): CallsService {
  const { rooms, url, roomPrefix, seatAccess, log } = options;
  const now = options.now ?? Date.now;
  const generateId = options.generateId ?? randomUUID;
  const issued = new Map<string, IssuedSeat>();
  const changes = createAccessChangeLog();
  const joins = new Map<string, { allow: () => boolean; usedAt: number }>();

  const allowJoin = (caller: string) => {
    const limit = joins.get(caller) ?? { allow: createRateLimit(CALL_JOIN_RATE.burst, CALL_JOIN_RATE.perSecond, now), usedAt: 0 };
    joins.set(caller, { ...limit, usedAt: now() });
    return limit.allow();
  };

  const stillAllowed = async (identity: string, sceneId: string) => {
    const entry = issued.get(identity);
    if (!entry) return false;
    const access = await seatAccess(entry.seat);
    return access?.scene.sceneId === sceneId;
  };

  const forgetStale = (present: ReadonlySet<string>) => {
    const cutoff = now() - CALL_RECORD_GRACE_MS;
    for (const [identity, entry] of issued) if (!present.has(identity) && entry.seenAt < cutoff) issued.delete(identity);
    for (const [caller, limit] of joins) if (limit.usedAt < cutoff) joins.delete(caller);
  };

  const recheckScene = async (callRooms: CallRooms, sceneId: string): Promise<string[]> => {
    const room = callRoomOf(roomPrefix, sceneId);
    try {
      const present = await callRooms.listIdentities(room);
      const staying: string[] = [];
      for (const identity of present) {
        if (await stillAllowed(identity, sceneId)) {
          issued.get(identity)!.seenAt = now();
          staying.push(identity);
          continue;
        }
        issued.delete(identity);
        await callRooms.removeParticipant(room, identity);
      }
      return staying;
    } catch (error) {
      log(`Checking who may stay in call ${room} failed: ${error instanceof Error ? error.name : "unknown error"}`);
      return [];
    }
  };

  const recheck = async (callRooms: CallRooms, sceneIds: Iterable<string>) => {
    const staying: string[] = [];
    for (const sceneId of new Set(sceneIds)) staying.push(...(await recheckScene(callRooms, sceneId)));
    return staying;
  };

  return {
    available: rooms !== undefined && url !== undefined,

    join: async (seat) => {
      if (!rooms || !url) throw new CallsUnavailable();
      if (!allowJoin(callerOf(seat))) throw new TooManyCallJoins();
      const stopWatching = changes.watch();
      try {
        const identity = generateId();
        let checkedAt: number;
        let access: SeatAccess | undefined;
        let token: string;
        do {
          checkedAt = changes.mark();
          access = await seatAccess(seat);
          if (!access) throw new UnknownScene();
          token = await rooms.issueToken({
            room: callRoomOf(roomPrefix, access.scene.sceneId),
            identity,
            name: access.name,
            avatarId: access.avatarId,
            ttlSeconds: CALL_TOKEN_TTL_SECONDS,
          });
        } while (changes.changedSince(checkedAt, access.scene));
        issued.set(identity, { seat, ...access.scene, seenAt: now() });
        return { url, token };
      } finally {
        stopWatching();
      }
    },

    revalidate: async (change) => {
      changes.record(change);
      if (!rooms) return;
      await recheck(
        rooms,
        [...issued.values()]
          .filter((entry) => ("sceneId" in change ? entry.sceneId === change.sceneId : entry.workspaceId === change.workspaceId))
          .map((entry) => entry.sceneId),
      );
    },

    revalidateAll: async () => {
      changes.record("everything");
      if (!rooms) return;
      try {
        const sceneIds = (await rooms.listRooms()).flatMap((room) => sceneIdOfRoom(roomPrefix, room) ?? []);
        forgetStale(new Set(await recheck(rooms, sceneIds)));
      } catch (error) {
        log(`Listing call rooms failed: ${error instanceof Error ? error.name : "unknown error"}`);
      }
    },
  };
}
