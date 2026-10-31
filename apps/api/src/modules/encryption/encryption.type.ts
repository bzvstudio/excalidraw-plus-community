export type SealContext = {
  kind: string;
  id: string;
};

export type Sealed = {
  bytes: Buffer;
  keyId: string;
};

export type Envelope = {
  keyId: string;
  iv: Buffer;
  tag: Buffer;
  ciphertext: Buffer;
};

export type Sealer = {
  currentKeyId: string;
  seal: (plaintext: Buffer, context: SealContext) => Sealed;
  open: (sealed: Buffer, context: SealContext) => Buffer;
};

export type Resealer = {
  kind: string;
  resealNext: (limit: number) => Promise<number>;
  missing?: { start: () => void; found: () => readonly string[] };
};

export type ResealReport = { resealed: Record<string, number>; missing: Record<string, readonly string[]> };
