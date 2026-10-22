import "dotenv/config";
import path from "node:path";
import { getDb, databaseDriver, closeDb } from "./client";
import type { Db } from "./client";

const MIGRATIONS_FOLDER = path.resolve(process.cwd(), "drizzle");

export async function runMigrations(db?: Db): Promise<void> {
  const database = db ?? (await getDb());
  if (databaseDriver() === "pg") {
    const { migrate } = await import("drizzle-orm/node-postgres/migrator");
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await migrate(database as any, { migrationsFolder: MIGRATIONS_FOLDER });
  } else {
    const { migrate } = await import("drizzle-orm/pglite/migrator");
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await migrate(database as any, { migrationsFolder: MIGRATIONS_FOLDER });
  }
}

const isDirectRun = process.argv[1] && /migrate\.(ts|js)$/.test(process.argv[1]);
if (isDirectRun) {
  runMigrations()
    .then(async () => {
      console.log(`[db] migrations applied (${databaseDriver()})`);
      await closeDb();
      process.exit(0);
    })
    .catch(async (err) => {
      console.error("[db] migration failed", err);
      await closeDb();
      process.exit(1);
    });
}
