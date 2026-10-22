import type { SQL } from "drizzle-orm";
import type { PgDatabase, PgQueryResultHKT } from "drizzle-orm/pg-core";
import * as schema from "./schema";

export type Db = PgDatabase<PgQueryResultHKT, typeof schema>;

type Driver = "pg" | "pglite";

declare global {
  // eslint-disable-next-line no-var
  var __memecoinDb: { db: Db; driver: Driver; close: () => Promise<void> } | undefined;
}

export function databaseDriver(): Driver {
  const url = process.env.DATABASE_URL?.trim();
  if (!url || url.startsWith("pglite:")) return "pglite";
  return "pg";
}

export function pgliteDataDir(): string {
  const url = process.env.DATABASE_URL?.trim();
  if (url && url.startsWith("pglite://")) return url.slice("pglite://".length) || "./data/pglite";
  return process.env.PGLITE_DIR ?? "./data/pglite";
}

async function create(): Promise<{ db: Db; driver: Driver; close: () => Promise<void> }> {
  const driver = databaseDriver();
  if (driver === "pg") {
    const { Pool } = await import("pg");
    const { drizzle } = await import("drizzle-orm/node-postgres");
    const pool = new Pool({ connectionString: process.env.DATABASE_URL, max: 10 });
    pool.on("error", (err) => console.error("[db] pool error", err.message));
    const db = drizzle(pool, { schema }) as unknown as Db;
    return { db, driver, close: () => pool.end() };
  }
  const { PGlite } = await import("@electric-sql/pglite");
  const { drizzle } = await import("drizzle-orm/pglite");
  const dir = pgliteDataDir();
  const client = dir === ":memory:" ? new PGlite() : new PGlite(dir);
  await client.waitReady;
  const db = drizzle(client, { schema }) as unknown as Db;
  return { db, driver, close: () => client.close() };
}

/**
 * Process-wide singleton. Next.js hot reload re-evaluates modules, so the
 * instance is parked on globalThis to avoid leaking connection pools.
 */
export async function getDb(): Promise<Db> {
  if (!globalThis.__memecoinDb) {
    globalThis.__memecoinDb = await create();
  }
  return globalThis.__memecoinDb.db;
}

/**
 * Runs a raw SQL query and returns the row array. node-postgres and PGlite both
 * answer with `{ rows }`, but the driver-agnostic Db type erases that shape.
 */
export async function rawRows<T extends Record<string, unknown>>(db: Db, query: SQL): Promise<T[]> {
  const res = (await db.execute(query)) as unknown as { rows?: T[] } | T[];
  if (Array.isArray(res)) return res;
  return res.rows ?? [];
}

export async function closeDb(): Promise<void> {
  if (globalThis.__memecoinDb) {
    await globalThis.__memecoinDb.close();
    globalThis.__memecoinDb = undefined;
  }
}

export { schema };
