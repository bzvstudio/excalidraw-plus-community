import { serve } from "@hono/node-server";
import type { Server } from "node:http";
import { migrateToLatest } from "@repo/db";
import { loadEnv } from "./config/env.js";
import { createContainer } from "./container.js";
import { createApp } from "./http/app.js";
import { AUDIT_PRUNE_INTERVAL_MS } from "./modules/audit/audit.const.js";
import { schedulePruning } from "./modules/audit/audit.utils.js";
import { attachRealtime } from "./realtime/server.js";

const env = loadEnv();
const stopWhileStarting = () => process.exit(1);
for (const signal of ["SIGTERM", "SIGINT"] as const) process.once(signal, stopWhileStarting);
if (env.NODE_ENV !== "development") {
  const { applied, total } = await migrateToLatest(env.DATABASE_URL);
  console.log(applied > 0 ? `Applied ${applied} of ${total} database migrations` : `Database is up to date (${total} migrations)`);
}
const container = createContainer(env);
const app = createApp(container);

await container.services.auth.announceSetupCode();

const server = serve({ fetch: app.fetch, port: env.PORT }, (info) => {
  console.log(`API listening on http://localhost:${info.port} (${env.NODE_ENV}, sign-up: ${env.SIGNUP_MODE})`);
});
const realtime = attachRealtime(container, server as Server);
const stopPruning = schedulePruning(container.services.audit, AUDIT_PRUNE_INTERVAL_MS, (line) => console.log(line));

for (const signal of ["SIGTERM", "SIGINT"] as const) {
  process.off(signal, stopWhileStarting);
  process.once(signal, () => {
    console.log(`${signal} received: saving open scenes before exiting`);
    stopPruning();
    void realtime.close().then(
      (unsaved) => {
        if (unsaved > 0) console.error(`${unsaved} open scenes could not be saved before exiting`);
        process.exit(unsaved > 0 ? 1 : 0);
      },
      (error: unknown) => {
        console.error(error);
        process.exit(1);
      },
    );
  });
}
