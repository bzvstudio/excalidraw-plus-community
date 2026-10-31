import type { Membership } from "../authorization/authorization.type.js";

export type Thumbnail = {
  bytes: Buffer;
  etag: string;
};

export type ThumbnailsService = {
  put: (actor: Membership, sceneId: string, bytes: Buffer) => Promise<{ etag: string }>;
  get: (actor: Membership, sceneId: string) => Promise<Thumbnail>;
  resealNext: (limit: number) => Promise<number>;
};
