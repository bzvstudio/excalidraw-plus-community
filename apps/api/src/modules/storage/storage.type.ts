export type StorageProviderName = "memory" | "s3";

export type StorageProvider = {
  put: (key: string, bytes: Buffer) => Promise<void>;
  get: (key: string) => Promise<Buffer | undefined>;
  deleteAll: (prefix: string) => Promise<void>;
};
