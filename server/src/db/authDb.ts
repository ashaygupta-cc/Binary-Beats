/**
 * Drizzle database connection for auth data (the `users` table) — deliberately
 * a separate Neon project from the main dataset DB (server/src/db/index.ts),
 * since the CF problem/test dataset alone sits right at the free-tier storage
 * cap and auth has nothing to do with it.
 *
 * `authDb` is null when AUTH_DATABASE_URL isn't set, rather than throwing —
 * auth being unconfigured shouldn't take down the rest of the API. Routes
 * that need it check for null and return 503 (see routes/auth.ts).
 */
import "dotenv/config";
import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "./schema.js";

const { Pool } = pg;

export const authDb = process.env.AUTH_DATABASE_URL
  ? drizzle(
      new Pool({
        connectionString: process.env.AUTH_DATABASE_URL,
        ssl: { rejectUnauthorized: false }, // Neon requires SSL
        max: 5,
        idleTimeoutMillis: 30_000,
        connectionTimeoutMillis: 5_000,
      }),
      { schema }
    )
  : null;
