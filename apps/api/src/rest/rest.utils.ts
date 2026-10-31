import { BYTES_PER_MB } from "../modules/system/system.const.js";
import { BASE64_GROWTH, REQUEST_ENVELOPE_BYTES, REST_FILES_PER_REQUEST } from "./rest.const.js";

export function restRequestMaxBytes(sceneMaxMb: number, fileMaxMb: number) {
  const scene = Math.ceil(sceneMaxMb * BYTES_PER_MB) + REQUEST_ENVELOPE_BYTES;
  return { scene, withImages: scene + Math.ceil(REST_FILES_PER_REQUEST * fileMaxMb * BASE64_GROWTH * BYTES_PER_MB) };
}
