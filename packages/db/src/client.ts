import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema.js";

export type DatabaseOptions = {
  maxConnections?: number;
  connectionTimeoutMs?: number;
  onIdleConnectionError?: (error: Error) => void;
};

export function createDatabase(connectionString: string, options: DatabaseOptions = {}): Database {
  const pool = new Pool({
    connectionString,
    max: options.maxConnections,
    connectionTimeoutMillis: options.connectionTimeoutMs,
  });
  pool.on("error", (error) => options.onIdleConnectionError?.(error));

  return drizzle(pool, { schema });
}

export type Database = ReturnType<typeof drizzle<typeof schema>>;

export type Transaction = Parameters<Parameters<Database["transaction"]>[0]>[0];

export type Executor = Database | Transaction;
