import { randomInt } from "node:crypto";
import type { AccessService } from "../access/access.type.js";
import { createAccessChangeLog } from "../access/access.utils.js";
import type { SceneElement, SceneLimits, SceneRef, ScenesService, StoredScene } from "../scenes/scenes.type.js";
import { authorOf, pickSceneAppState, SceneTooLarge, UnknownScene, keepsStoredElement } from "../scenes/scenes.utils.js";
import type { SharingService } from "../sharing/sharing.type.js";
import type { WorkspacesService } from "../workspaces/workspaces.type.js";
import { assertCan, WorkspaceAccessDenied } from "../authorization/authorization.utils.js";
import { PERSIST_IDLE_MS, PERSIST_MAX_WAIT_MS } from "./collab.const.js";
import type { CollabChannel, CollabService, Participant, Room, SeatAccess, SeatAccessCheck, SessionUser } from "./collab.type.js";
import {
  bumpedEdits,
  changedAppState,
  CollabClosing,
  elementBytes,
  followsBack,
  fitsLimitsWith,
  losesAccess,
  newerElements,
  NotInRoom,
  orderedElements,
  SceneNotSaved,
} from "./collab.utils.js";

export function createSeatAccess(options: {
  access: AccessService;
  sharing: Pick<SharingService, "grantFor">;
  workspaces: Pick<WorkspacesService, "membership">;
  sessionUser: SessionUser;
}): SeatAccessCheck {
  const { access, sharing, workspaces, sessionUser } = options;
  return async (seat) => {
    try {
      if (seat.kind === "link") {
        const signedIn = seat.principal !== null && seat.session !== undefined && (await sessionUser(seat.session)) === seat.principal.userId;
        const principal = signedIn ? seat.principal : null;
        const grant = await sharing.grantFor(seat.linkId, seat.visitor, principal);
        return {
          scene: { workspaceId: grant.workspaceId, sceneId: grant.sceneId },
          access: grant.access,
          userId: grant.by.userId,
          name: grant.by.name,
          avatarId: principal?.avatarId ?? null,
        };
      }
      if ((await sessionUser(seat.session)) !== seat.userId) return undefined;
      const actor = await workspaces.membership(seat.userId, seat.workspaceId);
      const sceneAccess = await access.sceneAccessById(actor, seat.sceneId);
      if (sceneAccess === "none") return undefined;
      return {
        scene: { workspaceId: seat.workspaceId, sceneId: seat.sceneId },
        access: sceneAccess,
        userId: seat.userId,
        name: seat.name,
        avatarId: seat.avatarId,
      };
    } catch (error) {
      if (losesAccess(error)) return undefined;
      throw error;
    }
  };
}

export function createCollabService(options: {
  scenes: Pick<ScenesService, "read" | "persist">;
  access: AccessService;
  sharing: Pick<SharingService, "grantFor">;
  workspaces: Pick<WorkspacesService, "membership">;
  sessionUser: SessionUser;
  channel: CollabChannel;
  limits: SceneLimits;
  log: (line: string) => void;
  now?: () => number;
  nonce?: () => number;
}): CollabService {
  const { scenes, access, sharing, workspaces, sessionUser, channel, limits, log } = options;
  const now = options.now ?? Date.now;
  const nonce = options.nonce ?? (() => randomInt(2 ** 31));
  const rooms = new Map<string, Room>();
  const opening = new Map<string, Promise<Room>>();
  const participants = new Map<string, Participant>();
  const joining = new Map<string, symbol>();
  const changes = createAccessChangeLog();
  let closing = false;

  const accessOf = createSeatAccess({ access, sharing, workspaces, sessionUser });

  const setElement = (room: Room, element: SceneElement) => {
    const size = elementBytes(element);
    room.totalBytes += size - (room.bytes.get(element.id) ?? 0);
    room.bytes.set(element.id, size);
    room.elements.set(element.id, element);
  };

  const newRoom = (scene: SceneRef, stored: StoredScene): Room => {
    const room: Room = {
      scene,
      elements: new Map(),
      bytes: new Map(),
      totalBytes: 0,
      appState: stored.appState,
      version: stored.version,
      participants: new Set(),
      changed: new Set(),
      appStateChanged: false,
      lastEditor: null,
      writing: Promise.resolve(),
    };
    for (const element of stored.elements) setElement(room, element);
    return room;
  };

  const roomFor = (scene: SceneRef): Room | Promise<Room> => {
    const open = rooms.get(scene.sceneId) ?? opening.get(scene.sceneId);
    if (open) return open;
    const opened = scenes
      .read(scene)
      .then((stored) => {
        const room = newRoom(scene, stored);
        rooms.set(scene.sceneId, room);
        return room;
      })
      .finally(() => opening.delete(scene.sceneId));
    opening.set(scene.sceneId, opened);
    return opened;
  };

  const isDirty = (room: Room) => room.changed.size > 0 || room.appStateChanged;

  const clearTimers = (room: Room) => {
    clearTimeout(room.idleTimer);
    clearTimeout(room.maxWaitTimer);
    room.idleTimer = undefined;
    room.maxWaitTimer = undefined;
  };

  const discardIfIdle = (room: Room) => {
    if (room.participants.size > 0 || isDirty(room) || rooms.get(room.scene.sceneId) !== room) return;
    clearTimers(room);
    rooms.delete(room.scene.sceneId);
  };

  const close = (room: Room) => {
    room.closed = true;
    clearTimers(room);
    room.changed.clear();
    room.appStateChanged = false;
    for (const participantId of room.participants) {
      participants.delete(participantId);
      channel.evict(participantId, "deleted");
    }
    room.participants.clear();
    if (rooms.get(room.scene.sceneId) === room) rooms.delete(room.scene.sceneId);
  };

  const adoptStored = (room: Room, stored: readonly SceneElement[]) => {
    const missing = stored.filter((element) => {
      const known = room.elements.get(element.id);
      return !known || !keepsStoredElement(known, element);
    });
    for (const element of missing) setElement(room, element);
    return missing;
  };

  const write = async (room: Room) => {
    if (!isDirty(room)) return discardIfIdle(room);
    const ids = [...room.changed];
    const appStateChanged = room.appStateChanged;
    room.changed.clear();
    room.appStateChanged = false;
    const elements = ids.flatMap((id) => room.elements.get(id) ?? []);
    try {
      const stored = await scenes.persist(room.scene, { elements, appState: room.appState }, room.lastEditor);
      room.version = stored.version;
      const missing = adoptStored(room, stored.elements);
      if (missing.length > 0) channel.send([...room.participants], { elements: missing });
      discardIfIdle(room);
    } catch (error) {
      if (error instanceof UnknownScene) return close(room);
      for (const id of ids) room.changed.add(id);
      room.appStateChanged ||= appStateChanged;
      log(`Scene ${room.scene.sceneId} could not be saved from its room, and will be tried again: ${String(error)}`);
      if (!closing) schedule(room);
    }
  };

  const flush = (room: Room) => {
    clearTimers(room);
    room.writing = room.writing
      .then(() => write(room))
      .catch((error: unknown) => log(`Scene ${room.scene.sceneId}'s room failed while saving: ${String(error)}`));
    return room.writing;
  };

  const schedule = (room: Room) => {
    clearTimeout(room.idleTimer);
    room.idleTimer = setTimeout(() => void flush(room), PERSIST_IDLE_MS);
    room.maxWaitTimer ??= setTimeout(() => void flush(room), PERSIST_MAX_WAIT_MS);
  };

  const others = (room: Room, participantId: string) => [...room.participants].filter((id) => id !== participantId);

  const unfollow = (participantId: string, participant: Participant) => {
    const followedId = participant.following;
    participant.following = undefined;
    const followed = followedId === undefined ? undefined : participants.get(followedId);
    if (followedId !== undefined && followed?.followers.delete(participantId)) {
      channel.followers(followedId, followed.followers.size);
    }
  };

  const depart = async (participantId: string) => {
    const participant = participants.get(participantId);
    if (!participant) return;
    unfollow(participantId, participant);
    participants.delete(participantId);
    const room = rooms.get(participant.sceneId);
    if (!room) return;
    room.participants.delete(participantId);
    channel.depart([...room.participants], participantId);
    if (room.presentation?.presenterId === participantId) {
      room.presentation = undefined;
      channel.presentation([...room.participants], null);
    }
    if (room.participants.size === 0) await flush(room);
  };

  const recheck = async (participantId: string) => {
    const participant = participants.get(participantId);
    if (!participant) return;
    let current: SeatAccess | undefined;
    try {
      current = await accessOf(participant.seat);
    } catch (error) {
      log(`Access to scene ${participant.sceneId} could not be checked again: ${String(error)}`);
      return;
    }
    if (participants.get(participantId) !== participant) return;
    if (!current || current.scene.sceneId !== participant.sceneId) {
      channel.evict(participantId, "access");
      await depart(participantId);
      return;
    }
    participant.userId = current.userId;
    if (current.access !== participant.access) {
      participant.access = current.access;
      channel.changeAccess(participantId, current.access);
    }
  };

  const recheckRooms = async (affected: Room[]) => {
    await Promise.all(affected.flatMap((room) => [...room.participants].map(recheck)));
  };

  const editorIn = (participantId: string) => {
    if (closing) throw new CollabClosing();
    const participant = participants.get(participantId);
    const room = participant && rooms.get(participant.sceneId);
    if (!participant || !room) throw new NotInRoom();
    if (participant.access !== "edit") throw new WorkspaceAccessDenied("scene.edit");
    return { participant, room };
  };

  return {
    join: async (participantId, seat) => {
      if (closing) throw new CollabClosing();
      const attempt = Symbol(participantId);
      joining.set(participantId, attempt);
      const current = () => {
        if (joining.get(participantId) !== attempt) throw new NotInRoom();
        if (closing) throw new CollabClosing();
      };
      const stopWatching = changes.watch();
      try {
        await depart(participantId);
        let checkedAt = changes.mark();
        let granted = await accessOf(seat);
        current();
        if (!granted) throw new UnknownScene();
        let room = await roomFor(granted.scene);
        try {
          while (rooms.get(granted.scene.sceneId) !== room || changes.changedSince(checkedAt, granted.scene)) {
            current();
            if (changes.changedSince(checkedAt, granted.scene)) {
              checkedAt = changes.mark();
              granted = await accessOf(seat);
              current();
              if (!granted) throw new UnknownScene();
            }
            room = await roomFor(granted.scene);
          }
          current();
        } catch (error) {
          discardIfIdle(room);
          throw error;
        }
        joining.delete(participantId);
        room.participants.add(participantId);
        const present = others(room, participantId).flatMap((id) => {
          const person = participants.get(id);
          return person ? [{ ...person.presence, id, name: person.name, avatarId: person.avatarId }] : [];
        });
        participants.set(participantId, {
          seat,
          sceneId: granted.scene.sceneId,
          access: granted.access,
          userId: granted.userId,
          name: granted.name,
          avatarId: granted.avatarId,
          followers: new Set(),
          presence: {},
        });
        channel.introduce(participantId, present);
        channel.arrive(others(room, participantId), { id: participantId, name: granted.name, avatarId: granted.avatarId });
        if (room.presentation) channel.presentation([participantId], room.presentation);
        return { elements: orderedElements(room.elements), appState: room.appState, version: room.version, access: granted.access };
      } finally {
        if (joining.get(participantId) === attempt) joining.delete(participantId);
        stopWatching();
      }
    },

    edit: async (actor, sceneId, edits) => {
      if (closing) throw new CollabClosing();
      assertCan(actor, "scene.edit");
      const sceneAccess = await access.sceneAccessById(actor, sceneId);
      if (sceneAccess === "none") throw new UnknownScene();
      if (sceneAccess !== "edit") throw new WorkspaceAccessDenied("scene.edit");
      const scene = { workspaceId: actor.workspaceId, sceneId };
      let room = await roomFor(scene);
      while (rooms.get(sceneId) !== room) room = await roomFor(scene);
      if (closing) throw new CollabClosing();
      const bumped = bumpedEdits(room.elements, typeof edits === "function" ? edits(room.elements) : edits, now(), nonce);
      if (!fitsLimitsWith(room, bumped, {}, limits)) throw new SceneTooLarge(limits);
      for (const element of bumped.values()) {
        setElement(room, element);
        room.changed.add(element.id);
      }
      room.lastEditor = authorOf(actor);
      if (bumped.size > 0) channel.send([...room.participants], { elements: [...bumped.values()] });
      await flush(room);
      if (room.closed) throw new UnknownScene();
      if ([...bumped].some(([id, element]) => room.changed.has(id) && room.elements.get(id) === element)) throw new SceneNotSaved();
      const deleted = [...bumped.values()].filter((element) => element.isDeleted).length;
      return { version: room.version, upserted: bumped.size - deleted, deleted };
    },

    requireEditor: (participantId) => {
      editorIn(participantId);
    },

    update: (participantId, changes) => {
      const { participant, room } = editorIn(participantId);
      const newer = newerElements(room.elements, changes.elements);
      const appState = changes.appState ? pickSceneAppState(changes.appState) : {};
      const appStateChanged = changedAppState(room.appState, appState);
      if (newer.size === 0 && !appStateChanged) return;
      if (!fitsLimitsWith(room, newer, appState, limits)) throw new SceneTooLarge(limits);
      for (const element of newer.values()) {
        setElement(room, element);
        room.changed.add(element.id);
      }
      if (appStateChanged) {
        room.appState = { ...room.appState, ...appState };
        room.appStateChanged = true;
      }
      room.lastEditor = participant.userId;
      const others = [...room.participants].filter((id) => id !== participantId);
      channel.send(others, { elements: [...newer.values()], ...(appStateChanged && { appState: room.appState }) });
      schedule(room);
    },

    presence: (participantId, { viewport, ...presence }) => {
      const participant = participants.get(participantId);
      const room = participant && rooms.get(participant.sceneId);
      if (!participant || !room) throw new NotInRoom();
      participant.presence = { ...participant.presence, ...presence };
      if (Object.keys(presence).length > 0) channel.relay(others(room, participantId), { ...presence, from: participantId });
      if (viewport && participant.followers.size > 0) {
        channel.relay([...participant.followers], { viewport, from: participantId });
      }
    },

    follow: (participantId, { id, following }) => {
      const participant = participants.get(participantId);
      if (!participant) throw new NotInRoom();
      unfollow(participantId, participant);
      const followed = participants.get(id);
      if (!following || followed?.sceneId !== participant.sceneId || followsBack(participants, participantId, id)) return;
      participant.following = id;
      followed.followers.add(participantId);
      channel.followers(id, followed.followers.size);
    },

    present: (participantId, { slideId }) => {
      const participant = participants.get(participantId);
      const room = participant && rooms.get(participant.sceneId);
      if (!participant || !room) throw new NotInRoom();
      const current = room.presentation;
      if (current && current.presenterId !== participantId) return;
      if (slideId === null) {
        if (!current) return;
        room.presentation = undefined;
        channel.presentation(others(room, participantId), null);
        return;
      }
      if (current?.slideId === slideId) return;
      room.presentation = { presenterId: participantId, presenterName: participant.name, slideId };
      channel.presentation(others(room, participantId), room.presentation);
    },

    commentsChanged: (sceneId, threadId) => {
      const room = rooms.get(sceneId);
      if (room) channel.commentsChanged([...room.participants], threadId);
    },

    fileReady: (sceneId, fileId) => {
      const room = rooms.get(sceneId);
      if (room) channel.fileReady([...room.participants], fileId);
    },

    leave: async (participantId) => {
      joining.delete(participantId);
      await depart(participantId);
    },

    revalidate: async (change) => {
      changes.record(change);
      const affected = [...rooms.values()].filter((room) =>
        "sceneId" in change ? room.scene.sceneId === change.sceneId : room.scene.workspaceId === change.workspaceId,
      );
      await recheckRooms(affected);
    },

    revalidateAll: () => {
      changes.record("everything");
      return recheckRooms([...rooms.values()]);
    },

    shutdown: async () => {
      closing = true;
      await Promise.all([...rooms.values()].map(flush));
      await Promise.all([...rooms.values()].filter(isDirty).map(flush));
      return [...rooms.values()].filter(isDirty).length;
    },
  };
}
