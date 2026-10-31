import type { Env } from "../config/env.js";
import type { Resealer } from "../modules/encryption/encryption.type.js";
import type { RealtimeServer } from "../realtime/server.js";
import type { Services } from "./services.js";

export type Container = {
  env: Env;
  services: Services;
  resealers: Resealer[];
  realtime: RealtimeServer;
};
