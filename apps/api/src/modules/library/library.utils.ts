import { gunzipSync, gzipSync } from "node:zlib";
import type { Sealer } from "../encryption/encryption.type.js";
import { BYTES_PER_MB } from "../system/system.const.js";
import { LIBRARY_SEAL_KIND } from "./library.const.js";
import type { LibraryItem } from "./library.type.js";

export class LibraryChangedElsewhere extends Error {
  constructor() {
    super("The library changed in another tab or browser; merge and save again");
  }
}

export class LibraryTooLarge extends Error {
  constructor(maxBytes: number) {
    super(`The library can be at most ${Math.round(maxBytes / BYTES_PER_MB)} MB; remove some items`);
  }
}

export function librarySealContext(userId: string) {
  return { kind: LIBRARY_SEAL_KIND, id: userId };
}

export function sealItems(sealer: Sealer, userId: string, items: LibraryItem[]) {
  const { bytes, keyId } = sealer.seal(gzipSync(Buffer.from(JSON.stringify(items))), librarySealContext(userId));
  return { items: bytes, contentKeyId: keyId };
}

export function openItems(sealer: Sealer, userId: string, sealed: Buffer): LibraryItem[] {
  return JSON.parse(gunzipSync(sealer.open(sealed, librarySealContext(userId))).toString("utf8")) as LibraryItem[];
}
