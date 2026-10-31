import { store } from "../../stores/index.js";
import type { Sealer } from "../encryption/encryption.type.js";
import type { LibraryService } from "./library.type.js";
import { LibraryChangedElsewhere, LibraryTooLarge, openItems, sealItems } from "./library.utils.js";

export function createLibraryService(options: { sealer: Sealer; maxBytes: number; now?: () => Date }): LibraryService {
  const { sealer, maxBytes } = options;
  const now = options.now ?? (() => new Date());

  return {
    get: async (principal) => {
      const row = await store.libraries.get(principal.userId);
      return row ? { items: openItems(sealer, principal.userId, row.items), version: row.version } : { items: [], version: 0 };
    },

    save: async (principal, items, basedOn) => {
      if (Buffer.byteLength(JSON.stringify(items)) > maxBytes) throw new LibraryTooLarge(maxBytes);
      const next = { ...sealItems(sealer, principal.userId, items), version: basedOn + 1, updatedAt: now() };
      const saved =
        basedOn === 0
          ? await store.libraries.addIfAbsent({ userId: principal.userId, ...next })
          : await store.libraries.updateByUserIdAndVersion(principal.userId, basedOn, next);
      if (!saved) throw new LibraryChangedElsewhere();
      return { version: saved.version };
    },

    resealNext: async (limit) => {
      const rows = await store.libraries.getAllUserIdsNotSealedWith(sealer.currentKeyId, limit);
      for (const { userId } of rows) {
        await store.transaction(async (tx) => {
          const row = await store.libraries.getForUpdate(userId, tx);
          if (!row || row.contentKeyId === sealer.currentKeyId) return;
          await store.libraries.update(userId, sealItems(sealer, userId, openItems(sealer, userId, row.items)), tx);
        });
      }
      return rows.length;
    },
  };
}
