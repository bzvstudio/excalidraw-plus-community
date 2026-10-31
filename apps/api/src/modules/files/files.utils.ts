import { BYTES_PER_MB } from "../system/system.const.js";
import { FILE_SEAL_KIND, IMAGE_SIGNATURES, SVG_SNIFF_BYTES, SVG_START } from "./files.const.js";
import type { FileMimeType } from "./files.type.js";

export class UnknownFile extends Error {
  constructor() {
    super("No such file");
  }
}

export class FileTooLarge extends Error {
  constructor(maxBytes: number) {
    super(`An image can be at most ${Number((maxBytes / BYTES_PER_MB).toFixed(1))} MB`);
  }
}

export class FileMissingFromStorage extends Error {
  constructor(sceneId: string, fileId: string) {
    super(`File ${sceneId}/${fileId} is recorded but missing from storage`);
  }
}

export class FileTypeRefused extends Error {
  constructor() {
    super("Only PNG, JPEG, WebP, GIF and SVG images can be added");
  }
}

export function sniffImageType(bytes: Buffer): FileMimeType | undefined {
  const signature = IMAGE_SIGNATURES.find(({ parts }) =>
    parts.every(([offset, hex]) => bytes.subarray(offset, offset + hex.length / 2).toString("hex") === hex),
  );
  if (signature) return signature.mimeType;
  return SVG_START.test(bytes.subarray(0, SVG_SNIFF_BYTES).toString("utf8")) ? "image/svg+xml" : undefined;
}

export function sceneFilesPrefix(workspaceId: string, sceneId: string): string {
  return `workspaces/${workspaceId}/scenes/${sceneId}/files/`;
}

export function fileKey(workspaceId: string, sceneId: string, fileId: string): string {
  return `${sceneFilesPrefix(workspaceId, sceneId)}${fileId}`;
}

export function fileSealContext(sceneId: string, fileId: string) {
  return { kind: FILE_SEAL_KIND, id: `${sceneId}/${fileId}` };
}
