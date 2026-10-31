import { store } from "../../stores/index.js";
import { assertCan } from "../authorization/authorization.utils.js";
import type { AccessService } from "../access/access.type.js";
import type { Sealer } from "../encryption/encryption.type.js";
import { sniffImageType } from "../files/files.utils.js";
import { THUMBNAIL_MAX_BYTES } from "./thumbnails.const.js";
import type { ThumbnailsService } from "./thumbnails.type.js";
import {
  ThumbnailNotPng,
  thumbnailETag,
  thumbnailSealContext,
  ThumbnailTooLarge,
  UnknownThumbnail,
} from "./thumbnails.utils.js";

export function createThumbnailsService(options: {
  sealer: Sealer;
  access: AccessService;
  now?: () => Date;
}): ThumbnailsService {
  const { sealer, access } = options;
  const now = options.now ?? (() => new Date());

  return {
    put: async (actor, sceneId, bytes) => {
      assertCan(actor, "scene.edit");
      if (bytes.length > THUMBNAIL_MAX_BYTES) throw new ThumbnailTooLarge();
      if (sniffImageType(bytes) !== "image/png") throw new ThumbnailNotPng();
      const sealed = sealer.seal(bytes, thumbnailSealContext(sceneId));

      return store.transaction(async (tx) => {
        await access.requireScene(
          actor,
          await store.scenes.getByIdAndWorkspaceIdForKeyShare(sceneId, actor.workspaceId, tx),
          "edit",
          tx,
        );
        const row = await store.sceneThumbnails.upsert(
          { sceneId, image: sealed.bytes, contentKeyId: sealed.keyId, updatedAt: now() },
          tx,
        );
        return { etag: thumbnailETag(row.updatedAt) };
      });
    },

    get: async (actor, sceneId) => {
      assertCan(actor, "scene.view");
      await access.requireScene(actor, await store.scenes.getByIdAndWorkspaceId(sceneId, actor.workspaceId), "view");
      const row = await store.sceneThumbnails.get(sceneId);
      if (!row) throw new UnknownThumbnail();
      return { bytes: sealer.open(row.image, thumbnailSealContext(sceneId)), etag: thumbnailETag(row.updatedAt) };
    },

    resealNext: async (limit) => {
      const rows = await store.sceneThumbnails.getAllSceneIdsNotSealedWith(sealer.currentKeyId, limit);
      for (const { sceneId } of rows) {
        await store.transaction(async (tx) => {
          const row = await store.sceneThumbnails.getForUpdate(sceneId, tx);
          if (!row || row.contentKeyId === sealer.currentKeyId) return;
          const context = thumbnailSealContext(sceneId);
          const resealed = sealer.seal(sealer.open(row.image, context), context);
          await store.sceneThumbnails.update(sceneId, { image: resealed.bytes, contentKeyId: resealed.keyId }, tx);
        });
      }
      return rows.length;
    },
  };
}
