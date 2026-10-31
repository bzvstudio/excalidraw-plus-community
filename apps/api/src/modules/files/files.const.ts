import { z } from "zod";
import type { ImageSignature } from "./files.type.js";

export const FILE_SEAL_KIND = "file";

export const IMAGE_SIGNATURES: ImageSignature[] = [
  { mimeType: "image/png", parts: [[0, "89504e470d0a1a0a"]] },
  { mimeType: "image/jpeg", parts: [[0, "ffd8ff"]] },
  { mimeType: "image/gif", parts: [[0, "474946383761"]] },
  { mimeType: "image/gif", parts: [[0, "474946383961"]] },
  { mimeType: "image/webp", parts: [[0, "52494646"], [8, "57454250"]] },
];

export const SVG_SNIFF_BYTES = 4096;

export const SVG_START = /^\uFEFF?\s*(?:(?:<\?[^>]*\?>|<!--[\s\S]*?-->|<!DOCTYPE[^>]*>)\s*)*<svg[\s/>]/i;

export const FILE_ID_PATTERN = /^[A-Za-z0-9_-]{1,128}$/;

export const fileIdSchema = z.string().regex(FILE_ID_PATTERN);
