/**
 * Drizzle database connections — two separate Neon projects:
 *   DATABASE_URL    → Codeforces problems (9,931 problems)
 *   DATABASE_URL_LC → LeetCode problems  (2,800+ problems)
 *
 * Both use the same schema (problems, tests, ingest_meta).
 */
import "dotenv/config";
import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "./schema.js";

const { Pool } = pg;

if (!process.env.DATABASE_URL) {
  throw new Error(
    "[db] DATABASE_URL is not set. " +
    "Create server/.env with DATABASE_URL=postgresql://... (CF database)"
  );
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
  max: 10,
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 5_000,
});

export const db = drizzle(pool, { schema });

// ── LeetCode database (optional — falls back to CF db if not set) ────
const lcUrl = process.env.DATABASE_URL_LC;
const lcPool = lcUrl
  ? new Pool({
      connectionString: lcUrl,
      ssl: { rejectUnauthorized: false },
      max: 10,
      idleTimeoutMillis: 30_000,
      connectionTimeoutMillis: 5_000,
    })
  : null;

export const dbLC = lcPool ? drizzle(lcPool, { schema }) : db;

export type DB = typeof db;
