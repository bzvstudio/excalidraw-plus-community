import { createHmac } from "node:crypto";
import {
  ENVELOPE_FORMAT,
  HEADER_BYTES,
  IV_BYTES,
  KEY_BYTES,
  KEY_ID_BYTES,
  KEY_ID_LABEL,
  TAG_BYTES,
} from "./encryption.const.js";
import type { Envelope, SealContext } from "./encryption.type.js";

export class CannotDecrypt extends Error {
  constructor(reason: string) {
    super(`This data cannot be decrypted: ${reason}`);
  }
}

export function parseKey(base64: string): Buffer | undefined {
  const key = Buffer.from(base64, "base64");
  if (key.length !== KEY_BYTES || key.toString("base64") !== base64) return undefined;
  return key.every((byte) => byte === key[0]) ? undefined : key;
}

export function keyIdOf(key: Buffer): string {
  return createHmac("sha256", key).update(KEY_ID_LABEL).digest().subarray(0, KEY_ID_BYTES).toString("hex");
}

export function associatedData(context: SealContext): Buffer {
  return Buffer.from(`${context.kind}:${context.id}`);
}

export function encodeEnvelope(parts: Envelope): Buffer {
  return Buffer.concat([Buffer.from([ENVELOPE_FORMAT]), Buffer.from(parts.keyId, "hex"), parts.iv, parts.tag, parts.ciphertext]);
}

export function decodeEnvelope(bytes: Buffer): Envelope {
  if (bytes.length < HEADER_BYTES || bytes[0] !== ENVELOPE_FORMAT) {
    throw new CannotDecrypt("it is not in a format this server writes");
  }
  let offset = 1;
  const take = (length: number) => bytes.subarray(offset, (offset += length));
  return {
    keyId: take(KEY_ID_BYTES).toString("hex"),
    iv: take(IV_BYTES),
    tag: take(TAG_BYTES),
    ciphertext: bytes.subarray(offset),
  };
}
