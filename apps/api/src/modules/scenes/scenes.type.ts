import type { SceneListFilter } from "../../stores/scenes.store.js";
import type { Actor, Membership } from "../authorization/authorization.type.js";
import type { SceneGrant, ShareRole } from "../sharing/sharing.type.js";

export type { SceneListFilter };

export type SceneElement = {
  id: string;
  version: number;
  versionNonce: number;
  isDeleted: boolean;
  index?: string | null;
  type: string;
  [property: string]: unknown;
};

export type SceneAppState = {
  viewBackgroundColor?: string;
  gridSize?: number;
  gridStep?: number;
  gridModeEnabled?: boolean;
};

export type SceneContent = {
  elements: SceneElement[];
  appState: SceneAppState;
};

export type SceneSummary = {
  id: string;
  collectionId: string | null;
  canDelete: boolean;
  title: string;
  version: number;
  createdBy: string | null;
  updatedBy: string | null;
  createdAt: Date;
  updatedAt: Date;
};

export type SceneListItem = SceneSummary & {
  createdByName: string | null;
  updatedByName: string | null;
  updatedByAvatarId: string | null;
  thumbnailUpdatedAt: Date | null;
};

export type Scene = SceneSummary & SceneContent;

export type ScenePatch = {
  title?: string;
  collectionId?: string | null;
};

export type SceneExport = {
  scene: Scene;
  files: { id: string; mimeType: string; bytes: Buffer }[];
};

export type ScenePageRequest = {
  cursor?: string;
  limit: number;
};

export type ScenePage = {
  items: SceneListItem[];
  nextCursor: string | null;
};

export type SceneFileUpload = {
  id: string;
  bytes: Buffer;
};

export type SceneRef = {
  workspaceId: string;
  sceneId: string;
};

export type StoredScene = SceneContent & {
  version: number;
};

export type SharedScene = SceneContent & {
  title: string;
  version: number;
  access: ShareRole;
  guestName: string;
};

export type SceneLimits = {
  maxElements: number;
  maxBytes: number;
};

export type ScenesService = {
  list: (actor: Actor, filter?: SceneListFilter) => Promise<SceneListItem[]>;
  listPage: (actor: Actor, filter: SceneListFilter, page: ScenePageRequest) => Promise<ScenePage>;
  get: (actor: Actor, sceneId: string) => Promise<Scene>;
  create: (
    actor: Actor,
    options?: { title?: string; collectionId?: string; content?: SceneContent; files?: readonly SceneFileUpload[] },
  ) => Promise<SceneSummary>;
  move: (actor: Actor, sceneId: string, collectionId: string | null) => Promise<SceneSummary>;
  update: (actor: Actor, sceneId: string, patch: ScenePatch) => Promise<SceneSummary>;
  export: (actor: Actor, sceneId: string, options: { withFiles: boolean }) => Promise<SceneExport>;
  rename: (actor: Actor, sceneId: string, title: string) => Promise<SceneSummary>;
  delete: (actor: Actor, sceneId: string) => Promise<void>;
  save: (actor: Membership, sceneId: string, changes: SceneContent) => Promise<{ version: number }>;
  getShared: (grant: SceneGrant) => Promise<SharedScene>;
  read: (scene: SceneRef) => Promise<StoredScene>;
  persist: (scene: SceneRef, changes: SceneContent, updatedBy: string | null) => Promise<StoredScene>;
  resealNext: (limit: number) => Promise<number>;
};
