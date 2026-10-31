import { AVATAR_MAX_BYTES, AVATAR_SEAL_KIND, WORKSPACE_AVATAR_SEAL_KIND } from "./avatars.const.js";

export class UnknownAvatar extends Error {
  constructor() {
    super("There is no such photo");
  }
}

export class AvatarTooLarge extends Error {
  constructor() {
    super(`A photo can be at most ${AVATAR_MAX_BYTES / 1024} KB`);
  }
}

export class AvatarNotAllowed extends Error {
  constructor() {
    super("A photo must be a PNG, JPEG or WebP image");
  }
}

export function avatarSealContext(userId: string) {
  return { kind: AVATAR_SEAL_KIND, id: userId };
}

export function workspaceAvatarSealContext(workspaceId: string) {
  return { kind: WORKSPACE_AVATAR_SEAL_KIND, id: workspaceId };
}
