import type { StorageProvider } from "../storage.type.js";

export function createMemoryStorage(): StorageProvider {
  const objects = new Map<string, Buffer>();

  return {
    put: async (key, bytes) => {
      objects.set(key, Buffer.from(bytes));
    },

    get: async (key) => {
      const bytes = objects.get(key);
      return bytes && Buffer.from(bytes);
    },

    deleteAll: async (prefix) => {
      for (const key of objects.keys()) if (key.startsWith(prefix)) objects.delete(key);
    },
  };
}
