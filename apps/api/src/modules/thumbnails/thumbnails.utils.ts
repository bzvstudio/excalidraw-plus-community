import { THUMBNAIL_MAX_BYTES, THUMBNAIL_SEAL_KIND } from "./thumbnails.const.js";

export class UnknownThumbnail extends Error {
  constructor() {
    super("This scene has no thumbnail yet");
  }
}

export class ThumbnailTooLarge extends Error {
  constructor() {
    super(`A thumbnail can be at most ${THUMBNAIL_MAX_BYTES / 1024} KB`);
  }
}

export class ThumbnailNotPng extends Error {
  constructor() {
    super("A thumbnail must be a PNG");
  }
}

export function thumbnailSealContext(sceneId: string) {
  return { kind: THUMBNAIL_SEAL_KIND, id: sceneId };
}

export function thumbnailETag(updatedAt: Date): string {
  return `"${updatedAt.getTime().toString(36)}"`;
}

export function matchesETag(ifNoneMatch: string | undefined, etag: string): boolean {
  if (!ifNoneMatch) return false;
  return ifNoneMatch.split(",").some((tag) => {
    const trimmed = tag.trim();
    return trimmed === "*" || trimmed.replace(/^W\//, "") === etag;
  });
}
