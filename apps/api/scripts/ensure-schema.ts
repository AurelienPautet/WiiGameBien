/**
 * Applies pending Drizzle migrations, then exits — the boot-time companion to
 * `pnpm db:migrate`, also run by the `db-migrate` workflow on every merge to
 * master.
 *
 * Why this exists: deploys ship CODE and SCHEMA together, but nothing used to
 * run the migrations against production. Migration 0005 (admin dashboard) went
 * live without being applied, so every auth query started failing on the
 * missing `OuiTank-players.is_admin` column and the whole login/signup flow
 * returned 500s. The root `start` script now chains this script before
 * `server.ts`, so the running code and its schema stay in lockstep whatever the
 * deploy mechanism is (Heroku buildpack web dyno, plain `pnpm start`, …).
 *
 * Safe to run on every boot: drizzle's migrator applies only the migrations
 * whose journal timestamp is newer than the last row of
 * `drizzle.__drizzle_migrations`, inside a single transaction (so a failure
 * rolls back as a whole and leaves the database untouched). Once the schema is
 * current it is a no-op.
 *
 * Standalone one-off script: load the root .env ourselves (the @ouigame/db
 * connection no longer loads dotenv — env is the caller's responsibility).
 */

// MUST be first: load the root .env before @ouigame/db creates its pool.
import "../env";

import path from "path";
import { db, pool } from "@ouigame/db";
import { migrate } from "drizzle-orm/node-postgres/migrator";

// Resolved from this file (apps/api/scripts/) to the schema package's folder.
const MIGRATIONS_FOLDER = path.join(
  import.meta.dirname,
  "../../../packages/db/migrations"
);

// Postgres advisory lock that serialises migrators. Two runs can now meet on
// the same database (the merge-triggered CI job and a web dyno booting the same
// commit), and without this they would both see the migration as pending and
// collide mid-DDL, failing one of them. 0x4f756954616e6b is "OuiTank" in ASCII:
// arbitrary, but self-describing and unlikely to clash with another app sharing
// the database. Postgres drops the lock with the session if we die holding it.
const MIGRATION_LOCK_KEY = "22365618407829099";

// Runs the migrator while holding the advisory lock. The lock has to live on a
// checked-out connection of its own: drizzle migrates through the pool, and a
// session-level lock is only held for the connection that took it.
async function withMigrationLock<T>(fn: () => Promise<T>): Promise<T> {
  const client = await pool.connect();
  try {
    await client.query("select pg_advisory_lock($1::bigint)", [
      MIGRATION_LOCK_KEY,
    ]);
    try {
      return await fn();
    } finally {
      await client.query("select pg_advisory_unlock($1::bigint)", [
        MIGRATION_LOCK_KEY,
      ]);
    }
  } finally {
    client.release();
  }
}

// How many migrations the database has recorded, or null when the journal
// doesn't exist yet (drizzle creates the `drizzle` schema on first migrate).
async function recordedMigrations(): Promise<number | null> {
  try {
    const { rows } = await pool.query<{ n: number }>(
      "select count(*)::int as n from drizzle.__drizzle_migrations"
    );
    return rows[0]?.n ?? 0;
  } catch {
    return null;
  }
}

async function ensureSchema() {
  try {
    // The journal reads live inside the lock: a run that waited for another
    // migrator must report the state it actually found, not what it saw before
    // queueing.
    await withMigrationLock(async () => {
      const before = await recordedMigrations();

      console.log("→ Applying pending database migrations…");
      await migrate(db, { migrationsFolder: MIGRATIONS_FOLDER });

      const after = await recordedMigrations();
      if (before === null) {
        console.log("✓ Migration journal initialised");
      } else if (after !== null && after > before) {
        console.log(`✓ Applied ${after - before} pending migration(s)`);
      } else {
        console.log("✓ Database schema already up to date");
      }
    });
  } finally {
    // Always close the pool: with it open, the process would never exit and the
    // chained `start` script would hang before the server boots.
    await pool.end();
  }
}

ensureSchema().catch((err) => {
  console.error("✗ Failed to apply database migrations:", err);
  process.exit(1);
});
