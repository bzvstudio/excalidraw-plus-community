import type { FileMimeType } from "../files/files.type.js";

export const AVATAR_SEAL_KIND = "avatar";

export const WORKSPACE_AVATAR_SEAL_KIND = "workspace-avatar";

export const AVATAR_MAX_BYTES = 262_144;

export const AVATAR_TYPES: readonly FileMimeType[] = ["image/png", "image/jpeg", "image/webp"];
