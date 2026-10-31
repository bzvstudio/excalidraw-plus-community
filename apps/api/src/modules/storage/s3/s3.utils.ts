import { BUCKET_MISSING_CODE, OBJECT_MISSING_CODES } from "./s3.const.js";

export class StorageDeleteFailed extends Error {
  constructor(keys: string[]) {
    super(`Storage refused to delete ${keys.length} object(s), starting with ${keys[0]}`);
  }
}

export function isObjectMissing(error: unknown): boolean {
  if (typeof error !== "object" || error === null) return false;
  const { name, $metadata } = error as { name?: unknown; $metadata?: { httpStatusCode?: unknown } };
  if (name === BUCKET_MISSING_CODE) return false;
  return $metadata?.httpStatusCode === 404 || (typeof name === "string" && OBJECT_MISSING_CODES.includes(name));
}
