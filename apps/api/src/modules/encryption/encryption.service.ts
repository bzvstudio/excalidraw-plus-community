import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";
import { CIPHER, IV_BYTES } from "./encryption.const.js";
import type { ResealReport, Resealer, Sealer } from "./encryption.type.js";
import { associatedData, CannotDecrypt, decodeEnvelope, encodeEnvelope, keyIdOf } from "./encryption.utils.js";

export function createSealer(keys: { current: Buffer; previous?: Buffer }): Sealer {
  const currentKeyId = keyIdOf(keys.current);
  const byId = new Map([[currentKeyId, keys.current]]);
  if (keys.previous) byId.set(keyIdOf(keys.previous), keys.previous);

  return {
    currentKeyId,

    seal: (plaintext, context) => {
      const iv = randomBytes(IV_BYTES);
      const cipher = createCipheriv(CIPHER, keys.current, iv);
      cipher.setAAD(associatedData(context));
      const ciphertext = Buffer.concat([cipher.update(plaintext), cipher.final()]);
      return {
        bytes: encodeEnvelope({ keyId: currentKeyId, iv, tag: cipher.getAuthTag(), ciphertext }),
        keyId: currentKeyId,
      };
    },

    open: (sealed, context) => {
      const envelope = decodeEnvelope(sealed);
      const key = byId.get(envelope.keyId);
      if (!key) throw new CannotDecrypt("it was encrypted with a key this server does not have");
      try {
        const decipher = createDecipheriv(CIPHER, key, envelope.iv);
        decipher.setAAD(associatedData(context));
        decipher.setAuthTag(envelope.tag);
        return Buffer.concat([decipher.update(envelope.ciphertext), decipher.final()]);
      } catch {
        throw new CannotDecrypt("it has been altered, or belongs to something else");
      }
    },
  };
}

export async function resealAll(resealers: Resealer[], batchSize: number): Promise<ResealReport> {
  const report: ResealReport = { resealed: {}, missing: {} };
  for (const { kind, resealNext, missing } of resealers) {
    report.resealed[kind] = 0;
    missing?.start();
    for (let handled = await resealNext(batchSize); handled > 0; handled = await resealNext(batchSize)) {
      report.resealed[kind] += handled;
    }
    const lost = missing?.found() ?? [];
    report.resealed[kind] -= lost.length;
    if (lost.length > 0) report.missing[kind] = lost;
  }
  return report;
}
