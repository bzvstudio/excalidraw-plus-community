import { Hono } from "hono";
import type { SystemService } from "../../modules/system/system.type.js";

export function createHealthRoutes(system: SystemService) {
  return new Hono().get("/", async (c) =>
    (await system.isDatabaseReachable())
      ? c.json({ status: "ok" })
      : c.json({ status: "unavailable" }, 503),
  );
}
