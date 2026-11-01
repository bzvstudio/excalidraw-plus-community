import { store } from "../../stores/index.js";
import type { DrizzleTransaction } from "../../stores/database.js";
import { assertCan, WorkspaceAccessDenied } from "../authorization/authorization.utils.js";
import { authorOf, UnknownScene } from "../scenes/scenes.utils.js";
import type { AccessService } from "../access/access.type.js";
import type { Sealer } from "../encryption/encryption.type.js";
import type { StorageProvider } from "../storage/storage.type.js";
import type { FileStored, FilesService } from "./files.type.js";
import {
  FileMissingFromStorage,
  fileKey,
  fileSealContext,
  FileTooLarge,
  FileTypeRefused,
  sceneFilesPrefix,
  sniffImageType,
  UnknownFile,
  workspaceFilesPrefix,
} from "./files.utils.js";

export function createFilesService(options: {
  storage: StorageProvider;
  sealer: Sealer;
  access: AccessService;
  maxBytes: number;
  fileStored?: FileStored;
  now?: () => Date;
}): FilesService {
  const { storage, sealer, access, maxBytes } = options;
  const fileStored = options.fileStored ?? (() => undefined);
  const now = options.now ?? (() => new Date());

  const checked = (bytes: Buffer) => {
    if (bytes.length > maxBytes) throw new FileTooLarge(maxBytes);
    const mimeType = sniffImageType(bytes);
    if (!mimeType) throw new FileTypeRefused();
    return mimeType;
  };

  const keep = async (
    workspaceId: string,
    sceneId: string,
    fileId: string,
    bytes: Buffer,
    createdBy: string | null,
    tx: DrizzleTransaction,
  ) => {
    const mimeType = checked(bytes);
    const sealed = sealer.seal(bytes, fileSealContext(sceneId, fileId));
    const added = await store.sceneFiles.addIfAbsent(
      { sceneId, fileId, mimeType, sizeBytes: bytes.length, contentKeyId: sealed.keyId, createdBy, createdAt: now() },
      tx,
    );
    if (!added) return { stored: false };
    await storage.put(fileKey(workspaceId, sceneId, fileId), sealed.bytes);
    return { stored: true };
  };

  const missing = new Set<string>();

  const read = async (workspaceId: string, sceneId: string, fileId: string) => {
    const file = await store.sceneFiles.get(sceneId, fileId);
    if (!file) throw new UnknownFile();
    const sealed = await storage.get(fileKey(workspaceId, sceneId, fileId));
    if (!sealed) throw new FileMissingFromStorage(sceneId, fileId);
    return { bytes: sealer.open(sealed, fileSealContext(sceneId, fileId)), mimeType: file.mimeType };
  };

  return {
    maxBytes,

    check: (bytes) => void checked(bytes),

    keepWithin: keep,

    put: async (actor, sceneId, fileId, bytes) => {
      assertCan(actor, "scene.edit");
      const kept = await store.transaction(async (tx) => {
        await access.requireScene(
          actor,
          await store.scenes.getByIdAndWorkspaceIdForKeyShare(sceneId, actor.workspaceId, tx),
          "edit",
          tx,
        );
        return keep(actor.workspaceId, sceneId, fileId, bytes, authorOf(actor), tx);
      });
      if (kept.stored) fileStored(sceneId, fileId);
      return kept;
    },

    get: async (actor, sceneId, fileId) => {
      assertCan(actor, "scene.view");
      if ((await access.sceneAccessById(actor, sceneId)) === "none") throw new UnknownFile();
      return read(actor.workspaceId, sceneId, fileId);
    },

    putShared: async (grant, fileId, bytes) => {
      if (grant.access !== "edit") throw new WorkspaceAccessDenied("scene.edit");
      const kept = await store.transaction(async (tx) => {
        if (!(await store.scenes.getByIdAndWorkspaceIdForKeyShare(grant.sceneId, grant.workspaceId, tx))) {
          throw new UnknownScene();
        }
        return keep(grant.workspaceId, grant.sceneId, fileId, bytes, grant.by.userId, tx);
      });
      if (kept.stored) fileStored(grant.sceneId, fileId);
      return kept;
    },

    getShared: (grant, fileId) => read(grant.workspaceId, grant.sceneId, fileId),

    removeAllOf: (workspaceId, sceneId) => storage.deleteAll(sceneFilesPrefix(workspaceId, sceneId)),

    removeAllOfWorkspace: (workspaceId) => storage.deleteAll(workspaceFilesPrefix(workspaceId)),

    resealNext: async (limit) => {
      const candidates = await store.sceneFiles.getAllNotSealedWith(sealer.currentKeyId, limit + missing.size);
      const files = candidates.filter(({ sceneId, fileId }) => !missing.has(`${sceneId}/${fileId}`)).slice(0, limit);
      for (const { sceneId, fileId } of files) {
        await store.transaction(async (tx) => {
          const scene = await store.scenes.getForKeyShare(sceneId, tx);
          const file = scene && (await store.sceneFiles.getForUpdate(sceneId, fileId, tx));
          if (!scene || !file || file.contentKeyId === sealer.currentKeyId) return;
          const key = fileKey(scene.workspaceId, sceneId, fileId);
          const sealed = await storage.get(key);
          if (!sealed) {
            missing.add(`${sceneId}/${fileId}`);
            return;
          }
          const context = fileSealContext(sceneId, fileId);
          const resealed = sealer.seal(sealer.open(sealed, context), context);
          await storage.put(key, resealed.bytes);
          await store.sceneFiles.update(sceneId, fileId, { contentKeyId: resealed.keyId }, tx);
        });
      }
      return files.length;
    },

    missingFromStorage: { start: () => missing.clear(), found: () => [...missing] },
  };
}
