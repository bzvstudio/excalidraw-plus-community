import { randomUUID } from "node:crypto";
import { store } from "../../stores/index.js";
import { auditActorOf, auditEvent } from "../audit/audit.utils.js";
import { assertCan } from "../authorization/authorization.utils.js";
import type { SealContext, Sealer } from "../encryption/encryption.type.js";
import { sniffImageType } from "../files/files.utils.js";
import { thumbnailETag } from "../thumbnails/thumbnails.utils.js";
import { AVATAR_MAX_BYTES, AVATAR_TYPES } from "./avatars.const.js";
import type { AvatarsService } from "./avatars.type.js";
import {
  AvatarNotAllowed,
  avatarSealContext,
  AvatarTooLarge,
  UnknownAvatar,
  workspaceAvatarSealContext,
} from "./avatars.utils.js";

export function createAvatarsService(options: { sealer: Sealer; now?: () => Date }): AvatarsService {
  const { sealer } = options;
  const now = options.now ?? (() => new Date());

  const assertAllowedPhoto = (bytes: Buffer) => {
    if (bytes.length > AVATAR_MAX_BYTES) throw new AvatarTooLarge();
    const mimeType = sniffImageType(bytes);
    if (!mimeType || !AVATAR_TYPES.includes(mimeType)) throw new AvatarNotAllowed();
  };

  const opened = (image: Buffer, context: SealContext, updatedAt: Date) => {
    const bytes = sealer.open(image, context);
    return { bytes, mimeType: sniffImageType(bytes)!, etag: thumbnailETag(updatedAt) };
  };

  return {
    put: async (userId, bytes) => {
      assertAllowedPhoto(bytes);
      const sealed = sealer.seal(bytes, avatarSealContext(userId));
      const row = await store.userAvatars.upsert({
        userId,
        id: randomUUID(),
        image: sealed.bytes,
        contentKeyId: sealed.keyId,
        updatedAt: now(),
      });
      return { id: row.id, etag: thumbnailETag(row.updatedAt) };
    },

    remove: async (userId) => {
      await store.userAvatars.delete(userId);
    },

    get: async (viewerId, avatarId) => {
      const person = await store.userAvatars.getByIdVisibleTo(viewerId, avatarId);
      if (person) return opened(person.image, avatarSealContext(person.userId), person.updatedAt);
      const workspace = await store.workspaceAvatars.getByIdVisibleTo(viewerId, avatarId);
      if (workspace) return opened(workspace.image, workspaceAvatarSealContext(workspace.workspaceId), workspace.updatedAt);
      throw new UnknownAvatar();
    },

    resealNext: async (limit) => {
      const rows = await store.userAvatars.getAllUserIdsNotSealedWith(sealer.currentKeyId, limit);
      for (const { userId } of rows) {
        await store.transaction(async (tx) => {
          const row = await store.userAvatars.getForUpdate(userId, tx);
          if (!row || row.contentKeyId === sealer.currentKeyId) return;
          const context = avatarSealContext(userId);
          const resealed = sealer.seal(sealer.open(row.image, context), context);
          await store.userAvatars.update(userId, { image: resealed.bytes, contentKeyId: resealed.keyId }, tx);
        });
      }
      return rows.length;
    },

    putForWorkspace: async (actor, bytes) => {
      assertCan(actor, "workspace.manage");
      assertAllowedPhoto(bytes);
      const { workspaceId } = actor;
      const sealed = sealer.seal(bytes, workspaceAvatarSealContext(workspaceId));
      const at = now();
      const row = await store.transaction(async (tx) => {
        const saved = await store.workspaceAvatars.upsert(
          { workspaceId, id: randomUUID(), image: sealed.bytes, contentKeyId: sealed.keyId, updatedAt: at },
          tx,
        );
        await store.auditEvents.add(
          auditEvent({ workspaceId, action: "workspace.photo_changed", actor: auditActorOf(actor), at }),
          tx,
        );
        return saved;
      });
      return { id: row.id, etag: thumbnailETag(row.updatedAt) };
    },

    removeForWorkspace: async (actor) => {
      assertCan(actor, "workspace.manage");
      const { workspaceId } = actor;
      await store.transaction(async (tx) => {
        if (!(await store.workspaceAvatars.delete(workspaceId, tx))) return;
        await store.auditEvents.add(
          auditEvent({ workspaceId, action: "workspace.photo_removed", actor: auditActorOf(actor), at: now() }),
          tx,
        );
      });
    },

    resealNextForWorkspaces: async (limit) => {
      const rows = await store.workspaceAvatars.getAllWorkspaceIdsNotSealedWith(sealer.currentKeyId, limit);
      for (const { workspaceId } of rows) {
        await store.transaction(async (tx) => {
          const row = await store.workspaceAvatars.getForUpdate(workspaceId, tx);
          if (!row || row.contentKeyId === sealer.currentKeyId) return;
          const context = workspaceAvatarSealContext(workspaceId);
          const resealed = sealer.seal(sealer.open(row.image, context), context);
          await store.workspaceAvatars.update(workspaceId, { image: resealed.bytes, contentKeyId: resealed.keyId }, tx);
        });
      }
      return rows.length;
    },
  };
}
