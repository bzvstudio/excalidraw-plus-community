import type { Membership } from "../authorization/authorization.type.js";
import type { FileMimeType } from "../files/files.type.js";

export type Avatar = {
  bytes: Buffer;
  mimeType: FileMimeType;
  etag: string;
};

export type AvatarsService = {
  put: (userId: string, bytes: Buffer) => Promise<{ id: string; etag: string }>;
  remove: (userId: string) => Promise<void>;
  get: (viewerId: string, avatarId: string) => Promise<Avatar>;
  resealNext: (limit: number) => Promise<number>;
  putForWorkspace: (actor: Membership, bytes: Buffer) => Promise<{ id: string; etag: string }>;
  removeForWorkspace: (actor: Membership) => Promise<void>;
  resealNextForWorkspaces: (limit: number) => Promise<number>;
};
