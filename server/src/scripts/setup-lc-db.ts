/**
 * setup-lc-db.ts — One-shot setup for the LeetCode Neon database.
 *
 * Creates all required tables (problems, tests, ingest_meta) if they
 * don't exist, then ingests ~2,800 LC problems from HuggingFace.
 *
 * Usage:
 *   npx tsx src/scripts/setup-lc-db.ts
 *
 * Requires DATABASE_URL_LC in server/.env (or DATABASE_URL as fallback).
 */
import "dotenv/config";
import pg from "pg";
import { gzipSync } from "node:zlib";

const DB_URL = process.env.DATABASE_URL_LC || process.env.DATABASE_URL;
if (!DB_URL) {
  console.error("❌  Set DATABASE_URL_LC in server/.env first.");
  process.exit(1);
}

const pool = new pg.Pool({
  connectionString: DB_URL,
  ssl: { rejectUnauthorized: false },
  max: 5,
});

// ────────────────────────────────────────────────────────────────
// Step 1: Create tables
// ────────────────────────────────────────────────────────────────
const CREATE_TABLES_SQL = `
CREATE TABLE IF NOT EXISTS problems (
  problem_key      TEXT PRIMARY KEY,
  contest_id       INTEGER NOT NULL DEFAULT 0,
  problem_index    TEXT NOT NULL DEFAULT '',
  title            TEXT,
  rating           INTEGER,
  tags             JSONB NOT NULL DEFAULT '[]',
  time_limit_ms    INTEGER,
  memory_limit_mb  INTEGER,
  description      TEXT,
  input_format     TEXT,
  output_format    TEXT,
  note             TEXT,
  examples         JSONB NOT NULL DEFAULT '[]',
  interactive      BOOLEAN NOT NULL DEFAULT FALSE,
  tests_complete   BOOLEAN NOT NULL DEFAULT FALSE,
  test_count       INTEGER NOT NULL DEFAULT 0,
  has_checker      BOOLEAN NOT NULL DEFAULT FALSE,
  checker_source   BYTEA,
  editorial        TEXT
);

CREATE TABLE IF NOT EXISTS tests (
  problem_key  TEXT NOT NULL REFERENCES problems(problem_key) ON DELETE CASCADE,
  test_index   INTEGER NOT NULL,
  input        BYTEA NOT NULL,
  output       BYTEA NOT NULL,
  PRIMARY KEY (problem_key, test_index)
);

CREATE TABLE IF NOT EXISTS ingest_meta (
  file        TEXT PRIMARY KEY,
  status      TEXT NOT NULL,
  rows        INTEGER,
  ingested_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_problems_rating ON problems(rating);
CREATE INDEX IF NOT EXISTS idx_problems_contest ON problems(contest_id);
CREATE INDEX IF NOT EXISTS idx_problems_judgeable ON problems(tests_complete, interactive, has_checker);
`;

// ────────────────────────────────────────────────────────────────
// Step 2: Ingestion from HuggingFace
// ────────────────────────────────────────────────────────────────
const HF_ROWS_URL = "https://datasets-server.huggingface.co/rows";
const DATASET = "newfacade/LeetCodeDataset";
const PAGE_SIZE = 100;

function slugToTitle(slug: string): string {
  return slug.split("-").map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
}

function diffToRating(d: string): number | null {
  if (d === "Easy") return 1200;
  if (d === "Medium") return 1600;
  if (d === "Hard") return 2100;
  return null;
}

function parseTests(testList: string[]): { input: string; output: string }[] {
  const results: { input: string; output: string }[] = [];
  for (const s of testList) {
    const m = s.match(/assert\s+\S+?\.\s*\S+?\((.+?)\)\s*==\s*(.+)$/);
    if (m) {
      results.push({ input: m[1].trim(), output: m[2].trim() });
    } else {
      const m2 = s.match(/assert\s+\S+?\((.+?)\)\s*==\s*(.+)$/);
      if (m2) {
        results.push({ input: m2[1].trim(), output: m2[2].trim() });
      } else if (s.includes("==")) {
        const [a, b] = s.split("==");
        results.push({ input: a.trim(), output: b.trim() });
      }
    }
  }
  return results;
}

async function fetchPage(offset: number): Promise<{ rows: any[]; total: number }> {
  const url =
    `${HF_ROWS_URL}?dataset=${encodeURIComponent(DATASET)}` +
    `&config=default&split=train&offset=${offset}&length=${PAGE_SIZE}`;
  const res = await fetch(url, { signal: AbortSignal.timeout(30000) });
  if (!res.ok) throw new Error(`HF ${res.status}: ${await res.text()}`);
  const body = await res.json() as any;
  return { rows: (body.rows ?? []).map((r: any) => r.row), total: body.num_rows_total ?? 0 };
}

async function main() {
  // ── Create tables ──────────────────────────────────────────
  console.log("📦  Creating tables in LC database...");
  await pool.query(CREATE_TABLES_SQL);
  console.log("✅  Tables ready.\n");

  // ── Check if already ingested ──────────────────────────────
  const meta = await pool.query(
    `SELECT status, rows FROM ingest_meta WHERE file = 'leetcode-dataset'`
  );
  if (meta.rows[0]?.status === "done" && !process.argv.includes("--force")) {
    console.log(`Already ingested (${meta.rows[0].rows} problems). Use --force to redo.`);
    process.exit(0);
  }

  // ── Ingest ─────────────────────────────────────────────────
  console.log("🚀  Ingesting newfacade/LeetCodeDataset...\n");

  let offset = 0;
  let inserted = 0;
  let total = 0;

  while (true) {
    let page;
    try {
      page = await fetchPage(offset);
    } catch (err) {
      console.error(`\n⚠️  Error at offset ${offset}: ${err}`);
      console.log("   Retrying in 5s...");
      await new Promise((r) => setTimeout(r, 5000));
      continue; // retry same offset
    }

    total = page.total;
    if (page.rows.length === 0) break;

    const client = await pool.connect();
    try {
      await client.query("BEGIN");

      for (const row of page.rows) {
        const slug = row.task_id?.trim();
        if (!slug) continue;

        const key = `LC-${slug}`;
        const tc = parseTests(row.test_list ?? []);
        const rating = diffToRating(row.difficulty);
        const tags = Array.isArray(row.tags) ? row.tags : [];
        const examples = tc.slice(0, 3);

        await client.query(
          `INSERT INTO problems (problem_key, contest_id, problem_index, title, rating, tags,
           time_limit_ms, memory_limit_mb, description, examples, tests_complete, test_count)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
           ON CONFLICT (problem_key) DO UPDATE SET
             title=EXCLUDED.title, rating=EXCLUDED.rating, tags=EXCLUDED.tags,
             description=EXCLUDED.description, examples=EXCLUDED.examples,
             tests_complete=EXCLUDED.tests_complete, test_count=EXCLUDED.test_count`,
          [
            key, 0, slug, slugToTitle(slug), rating, JSON.stringify(tags),
            2000, 256, row.query ?? row.prompt ?? "",
            JSON.stringify(examples), tc.length > 0, tc.length,
          ]
        );

        // Insert gzip-compressed test cases
        if (tc.length > 0) {
          await client.query(`DELETE FROM tests WHERE problem_key = $1`, [key]);
          for (let i = 0; i < tc.length; i++) {
            await client.query(
              `INSERT INTO tests (problem_key, test_index, input, output) VALUES ($1,$2,$3,$4)`,
              [key, i, gzipSync(tc[i].input), gzipSync(tc[i].output)]
            );
          }
        }

        inserted++;
      }

      await client.query("COMMIT");
    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    } finally {
      client.release();
    }

    process.stdout.write(`\r  ${inserted}/${total} problems ingested`);
    offset += PAGE_SIZE;
    await new Promise((r) => setTimeout(r, 300)); // be nice to HF
  }

  // ── Mark done ──────────────────────────────────────────────
  await pool.query(
    `INSERT INTO ingest_meta (file, status, rows, ingested_at)
     VALUES ('leetcode-dataset', 'done', $1, NOW())
     ON CONFLICT (file) DO UPDATE SET status='done', rows=$1, ingested_at=NOW()`,
    [inserted]
  );

  console.log(`\n\n✅  Done! ${inserted} LeetCode problems with test cases ingested.`);
  await pool.end();
  process.exit(0);
}

main().catch((e) => {
  console.error("\n❌  Failed:", e.message ?? e);
  process.exit(1);
});
