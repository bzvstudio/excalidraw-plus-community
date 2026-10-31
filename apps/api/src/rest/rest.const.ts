import { REST_PATH } from "../modules/system/system.const.js";

export const REST_FILES_PER_REQUEST = 25;

export const BASE64_GROWTH = 4 / 3;

export const REQUEST_ENVELOPE_BYTES = 64 * 1024;

export const REST_FILE_PATH = new RegExp(`^${REST_PATH}/scenes/[^/]+/files/[^/]+$`);
