import type { StorageProviderName } from "./storage.type.js";

export const STORAGE_PROVIDERS = ["memory", "s3"] as const satisfies readonly StorageProviderName[];
