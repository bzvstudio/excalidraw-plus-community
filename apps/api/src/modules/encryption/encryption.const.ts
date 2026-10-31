export const ENVELOPE_FORMAT = 1;

export const KEY_BYTES = 32;

export const KEY_ID_BYTES = 8;

export const IV_BYTES = 12;

export const TAG_BYTES = 16;

export const HEADER_BYTES = 1 + KEY_ID_BYTES + IV_BYTES + TAG_BYTES;

export const CIPHER = "aes-256-gcm";

export const KEY_ID_LABEL = "excalidraw-plus key id";

export const RESEAL_BATCH_SIZE = 100;
