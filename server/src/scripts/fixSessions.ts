/**
 * One-shot migration: drop and recreate blitz_sessions with the correct schema.
 * Safe to run — the table has no persistent data (was in-memory before).
 */
import "dotenv/config";
import pg from "pg";

const { Client } = pg;

const client = new Client({ connectionString: process.env.DATABASE_URL });
await client.connect();

await client.query(`DROP TABLE IF EXISTS blitz_sessions;`);

await client.query(`
  CREATE TABLE blitz_sessions (
    id                    TEXT PRIMARY KEY,
    mode                  TEXT NOT NULL,
    handles               JSONB NOT NULL,
    display_handles       JSONB NOT NULL,
    ratings               JSONB NOT NULL,
    baseline_submission_id JSONB NOT NULL,
    problems              JSONB NOT NULL,
    results               JSONB NOT NULL,
    solve_sources         JSONB,
    status                TEXT NOT NULL DEFAULT 'active',
    created_at_seconds    INTEGER NOT NULL,
    finished_at_seconds   INTEGER
  );
`);

console.log("✓ blitz_sessions recreated with correct schema");
await client.end();
