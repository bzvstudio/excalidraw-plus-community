import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { Client } from "pg";

const BUNDLED_MIGRATIONS = fileURLToPath(new URL("drizzle", import.meta.url));

const MIGRATIONS_FOLDER = existsSync(BUNDLED_MIGRATIONS) ? BUNDLED_MIGRATIONS : fileURLToPath(new URL("../drizzle", import.meta.url));

const MIGRATION_LOCK_KEY = 7_042_610_381;

const CONNECT_TIMEOUT_MS = 10_000;

const LOCK_WAIT = "5min";

const countApplied = async (client: Client) => {
  const { rows } = await client.query<{ table: string | null }>("select to_regclass('drizzle.__drizzle_migrations')::text as table");
  if (!rows[0]!.table) return 0;
  const counted = await client.query<{ applied: number }>("select count(*)::int as applied from drizzle.__drizzle_migrations");
  return counted.rows[0]!.applied;
};

export async function migrateToLatest(connectionString: string): Promise<{ applied: number; total: number }> {
  const client = new Client({ connectionString, connectionTimeoutMillis: CONNECT_TIMEOUT_MS });
  await client.connect();
  try {
    await client.query("select set_config('lock_timeout', $1, false)", [LOCK_WAIT]);
    await client.query("select pg_advisory_lock($1)", [MIGRATION_LOCK_KEY]);
    try {
      const before = await countApplied(client);
      await migrate(drizzle(client), { migrationsFolder: MIGRATIONS_FOLDER });
      const total = await countApplied(client);
      return { applied: total - before, total };
    } finally {
      await client.query("select pg_advisory_unlock($1)", [MIGRATION_LOCK_KEY]).catch(() => undefined);
    }
  } finally {
    await client.end().catch(() => undefined);
  }
}
