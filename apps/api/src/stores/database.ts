import {
  accounts,
  createDatabase,
  type Database,
  type Executor,
  sessions,
  type Transaction,
  users,
  verifications,
} from "@repo/db";
import { drizzleAdapter } from "better-auth/adapters/drizzle";

declare global {
  var db: Database;
}

export type { Executor, Transaction as DrizzleTransaction };

const CONNECTION_TIMEOUT_MS = 5_000;

export function connectDatabase(connectionString: string, maxConnections: number): void {
  global.db = createDatabase(connectionString, {
    maxConnections,
    connectionTimeoutMs: CONNECTION_TIMEOUT_MS,
    onIdleConnectionError: (error) =>
      console.error(`The database closed an idle connection: ${error.message}`),
  });
}

export function authDatabaseAdapter() {
  return drizzleAdapter(global.db, {
    provider: "pg",
    usePlural: true,
    schema: { users, sessions, accounts, verifications },
  });
}
