import type { AccessChange } from "../access/access.type.js";
import type { Principal } from "../auth/auth.type.js";
import type { Actor } from "../authorization/authorization.type.js";
import type { SceneAppState, SceneContent, SceneElement, SceneRef } from "../scenes/scenes.type.js";
import type { ShareRole, Visitor } from "../sharing/sharing.type.js";

export type JoinRequest = { workspaceId: string; sceneId: string } | { linkId: string };

export type CollabRefusal = "invalid" | "not_found" | "gone" | "forbidden" | "too_large" | "not_joined" | "unavailable";

export type EvictionReason = "access" | "deleted";

export type Seat =
  | { kind: "member"; userId: string; name: string; avatarId: string | null; workspaceId: string; sceneId: string; session: string }
  | { kind: "link"; linkId: string; visitor: Visitor | undefined; principal: Principal | null; session: string | undefined };

export type SeatAccess = {
  scene: SceneRef;
  access: ShareRole;
  userId: string | null;
  name: string;
  avatarId: string | null;
};

export type SeatAccessCheck = (seat: Seat) => Promise<SeatAccess | undefined>;

export type Participant = {
  seat: Seat;
  sceneId: string;
  access: ShareRole;
  userId: string | null;
  name: string;
  avatarId: string | null;
  followers: Set<string>;
  following?: string;
  presence: PresenceState;
};

export type Person = {
  id: string;
  name: string;
  avatarId: string | null;
};

export type SceneBounds = [minX: number, minY: number, maxX: number, maxY: number];

export type Presence = {
  pointer?: { x: number; y: number; tool: "pointer" | "laser" };
  button?: "up" | "down";
  selectedElementIds?: string[];
  userState?: "active" | "idle" | "away";
  viewport?: SceneBounds;
};

export type PresenceState = Omit<Presence, "viewport">;

export type PresentPerson = Person & PresenceState;

export type RelayedPresence = Presence & { from: string };

export type Presentation = {
  presenterId: string;
  presenterName: string;
  slideId: string;
};

export type Present = {
  slideId: string | null;
};

export type Follow = {
  id: string;
  following: boolean;
};

export type RemoteChanges = {
  elements: SceneElement[];
  appState?: SceneAppState;
};

export type JoinedRoom = SceneContent & {
  version: number;
  access: ShareRole;
};

export type Room = {
  scene: SceneRef;
  elements: Map<string, SceneElement>;
  bytes: Map<string, number>;
  totalBytes: number;
  appState: SceneAppState;
  version: number;
  participants: Set<string>;
  changed: Set<string>;
  appStateChanged: boolean;
  lastEditor: string | null;
  idleTimer?: ReturnType<typeof setTimeout>;
  maxWaitTimer?: ReturnType<typeof setTimeout>;
  writing: Promise<void>;
  presentation?: Presentation;
  closed?: boolean;
};

export type CollabReply<Answer extends object = object> = ({ ok: true } & Answer) | { ok: false; refusal: CollabRefusal };

export type ClientEvents = {
  join: (request: JoinRequest, ack: (reply: CollabReply<JoinedRoom>) => void) => void;
  update: (changes: RemoteChanges, ack: (reply: CollabReply) => void) => void;
  presence: (presence: Presence) => void;
  follow: (follow: Follow) => void;
  present: (present: Present) => void;
};

export type ServerEvents = {
  update: (changes: RemoteChanges) => void;
  access: (change: { access: ShareRole }) => void;
  evicted: (eviction: { reason: EvictionReason }) => void;
  people: (people: PresentPerson[]) => void;
  arrived: (person: Person) => void;
  departed: (person: { id: string }) => void;
  presence: (presence: RelayedPresence) => void;
  followers: (followers: { count: number }) => void;
  "file-ready": (file: { fileId: string }) => void;
  presentation: (presentation: Presentation | null) => void;
  "comments-changed": (change: { threadId: string }) => void;
};

export type Connected = {
  principal: Principal | null;
  visitor: Visitor | undefined;
  session: string | undefined;
};

export type SessionUser = (session: string) => Promise<string | null>;

export type CollabChannel = {
  send: (participantIds: readonly string[], changes: RemoteChanges) => void;
  changeAccess: (participantId: string, access: ShareRole) => void;
  evict: (participantId: string, reason: EvictionReason) => void;
  introduce: (participantId: string, people: PresentPerson[]) => void;
  arrive: (participantIds: readonly string[], person: Person) => void;
  depart: (participantIds: readonly string[], participantId: string) => void;
  relay: (participantIds: readonly string[], presence: RelayedPresence) => void;
  followers: (participantId: string, count: number) => void;
  fileReady: (participantIds: readonly string[], fileId: string) => void;
  presentation: (participantIds: readonly string[], presentation: Presentation | null) => void;
  commentsChanged: (participantIds: readonly string[], threadId: string) => void;
};

export type SceneEdits = {
  upsert: readonly SceneElement[];
  delete: readonly string[];
};

export type AppliedEdits = {
  version: number;
  upserted: number;
  deleted: number;
};

export type CollabService = {
  join: (participantId: string, seat: Seat) => Promise<JoinedRoom>;
  edit: (
    actor: Actor,
    sceneId: string,
    edits: SceneEdits | ((current: ReadonlyMap<string, SceneElement>) => SceneEdits),
  ) => Promise<AppliedEdits>;
  requireEditor: (participantId: string) => void;
  update: (participantId: string, changes: RemoteChanges) => void;
  presence: (participantId: string, presence: Presence) => void;
  follow: (participantId: string, follow: Follow) => void;
  fileReady: (sceneId: string, fileId: string) => void;
  commentsChanged: (sceneId: string, threadId: string) => void;
  present: (participantId: string, present: Present) => void;
  leave: (participantId: string) => Promise<void>;
  revalidate: (change: AccessChange) => Promise<void>;
  revalidateAll: () => Promise<void>;
  shutdown: () => Promise<number>;
};
