import {
  DeleteObjectsCommand,
  GetObjectCommand,
  ListObjectsV2Command,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import type { StorageProvider } from "../storage.type.js";
import type { S3StorageConfig } from "./s3.type.js";
import { isObjectMissing, StorageDeleteFailed } from "./s3.utils.js";

export function createS3Storage(config: S3StorageConfig): StorageProvider {
  const client = new S3Client({
    endpoint: config.endpoint,
    region: config.region,
    forcePathStyle: config.forcePathStyle,
    credentials: { accessKeyId: config.accessKeyId, secretAccessKey: config.secretAccessKey },
  });
  const Bucket = config.bucket;

  return {
    put: async (key, bytes) => {
      await client.send(new PutObjectCommand({ Bucket, Key: key, Body: bytes, ContentType: "application/octet-stream" }));
    },

    get: async (key) => {
      try {
        const object = await client.send(new GetObjectCommand({ Bucket, Key: key }));
        return object.Body ? Buffer.from(await object.Body.transformToByteArray()) : undefined;
      } catch (error) {
        if (isObjectMissing(error)) return undefined;
        throw error;
      }
    },

    deleteAll: async (prefix) => {
      let ContinuationToken: string | undefined;
      do {
        const page = await client.send(new ListObjectsV2Command({ Bucket, Prefix: prefix, ContinuationToken }));
        const keys = (page.Contents ?? []).flatMap(({ Key }) => (Key ? [Key] : []));
        if (keys.length > 0) {
          const result = await client.send(
            new DeleteObjectsCommand({ Bucket, Delete: { Objects: keys.map((Key) => ({ Key })), Quiet: true } }),
          );
          const failed = (result.Errors ?? []).flatMap(({ Key }) => (Key ? [Key] : []));
          if (failed.length > 0) throw new StorageDeleteFailed(failed);
        }
        ContinuationToken = page.IsTruncated ? page.NextContinuationToken : undefined;
      } while (ContinuationToken);
    },
  };
}
