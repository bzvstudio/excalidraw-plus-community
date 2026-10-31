import { LIBRARY_SITE } from "../modules/library/library.const.js";

export const EDITOR_INLINE_SCRIPT_HASHES = ["'sha256-wSEdAihvQbHab+iQoHekE76G2tTUP/L4/O79mmVtWDc='"];

export const contentSecurityPolicy = (options: { libraryBrowsing: boolean; callOrigins: readonly string[] }) => ({
  defaultSrc: ["'self'"],
  scriptSrc: ["'self'", ...EDITOR_INLINE_SCRIPT_HASHES],
  styleSrc: ["'self'", "'unsafe-inline'"],
  imgSrc: ["'self'", "data:", "blob:"],
  fontSrc: ["'self'", "data:"],
  connectSrc: ["'self'", ...(options.libraryBrowsing ? [LIBRARY_SITE] : []), ...options.callOrigins],
  workerSrc: ["'self'", "blob:"],
  frameSrc: ["'self'"],
  objectSrc: ["'none'"],
  baseUri: ["'self'"],
  formAction: ["'self'"],
  frameAncestors: ["'none'"],
});

export const FILE_CONTENT_SECURITY_POLICY = {
  defaultSrc: ["'none'"],
  styleSrc: ["'unsafe-inline'"],
  imgSrc: ["data:"],
  sandbox: [],
};
