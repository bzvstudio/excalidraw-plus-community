import type { DrizzleTransaction } from "../../stores/database.js";
import type { Actor } from "../authorization/authorization.type.js";
import type { SceneGrant } from "../sharing/sharing.type.js";

export type FileMimeType = "image/png" | "image/jpeg" | "image/webp" | "image/gif" | "image/svg+xml";

export type ImageSignature = {
  mimeType: FileMimeType;
  parts: [offset: number, hex: string][];
};

export type FileStored = (sceneId: string, fileId: string) => void;

export type StoredFile = {
  bytes: Buffer;
  mimeType: string;
};

export type FilesService = {
  maxBytes: number;
  check: (bytes: Buffer) => void;
  keepWithin: (
    workspaceId: string,
    sceneId: string,
    fileId: string,
    bytes: Buffer,
    createdBy: string | null,
    tx: DrizzleTransaction,
  ) => Promise<{ stored: boolean }>;
  put: (actor: Actor, sceneId: string, fileId: string, bytes: Buffer) => Promise<{ stored: boolean }>;
  get: (actor: Actor, sceneId: string, fileId: string) => Promise<StoredFile>;
  putShared: (grant: SceneGrant, fileId: string, bytes: Buffer) => Promise<{ stored: boolean }>;
  getShared: (grant: SceneGrant, fileId: string) => Promise<StoredFile>;
  removeAllOf: (workspaceId: string, sceneId: string) => Promise<void>;
  removeAllOfWorkspace: (workspaceId: string) => Promise<void>;
  resealNext: (limit: number) => Promise<number>;
  missingFromStorage: { start: () => void; found: () => readonly string[] };
};
