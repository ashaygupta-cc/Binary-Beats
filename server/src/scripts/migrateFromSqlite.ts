/**
 * Highly optimized migration script: bulk copy problems and tests from the local SQLite database
 * (data/problems.db) to Neon PostgreSQL via Drizzle ORM.
 *
 * Usage: npm run migrate-sqlite
 */
import "dotenv/config";
import Database from "better-sqlite3";
import { db } from "../db/index.js";
import { problems, tests } from "../db/schema.js";
import { sql } from "drizzle-orm";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SQLITE_PATH = path.join(__dirname, "../../data/problems.db");

interface SqliteProblem {
  problem_key: string;
  contest_id: number;
  problem_index: string;
  title: string | null;
  rating: number | null;
  tags: string; // JSON string
  time_limit_ms: number | null;
  memory_limit_mb: number | null;
  description: string | null;
  input_format: string | null;
  output_format: string | null;
  note: string | null;
  examples: string; // JSON string
  interactive: number;
  tests_complete: number;
  test_count: number;
  has_checker: number;
  checker_source: Buffer | null;
  editorial: string | null;
}

interface SqliteTest {
  problem_key: string;
  test_index: number;
  input: Buffer;
  output: Buffer;
}

async function main() {
  console.log(`Connecting to SQLite at ${SQLITE_PATH}...`);
  const sdb = new Database(SQLITE_PATH, { readonly: true });

  console.log("Migrating problems in bulk...");
  const sqliteProblems = sdb.prepare("SELECT * FROM problems").all() as SqliteProblem[];
  console.log(`Found ${sqliteProblems.length} problems to migrate.`);

  // 19 parameters per row. 200 rows = 3800 parameters.
  const BATCH_SIZE_PROBLEMS = 200;
  for (let i = 0; i < sqliteProblems.length; i += BATCH_SIZE_PROBLEMS) {
    const chunk = sqliteProblems.slice(i, i + BATCH_SIZE_PROBLEMS);
    
    const insertData = chunk.map(row => {
      let tags: string[] = [];
      try {
        tags = JSON.parse(row.tags);
      } catch {}

      let examples: { input: string; output: string }[] = [];
      try {
        examples = JSON.parse(row.examples);
      } catch {}

      return {
        problemKey: row.problem_key,
        contestId: row.contest_id,
        problemIndex: row.problem_index,
        title: row.title,
        rating: row.rating,
        tags,
        timeLimitMs: row.time_limit_ms,
        memoryLimitMb: row.memory_limit_mb,
        description: row.description,
        inputFormat: row.input_format,
        outputFormat: row.output_format,
        note: row.note,
        examples,
        interactive: row.interactive === 1,
        testsComplete: row.tests_complete === 1,
        testCount: row.test_count,
        hasChecker: row.has_checker === 1,
        checkerSource: row.checker_source,
        editorial: row.editorial,
      };
    });

    await db
      .insert(problems)
      .values(insertData)
      .onConflictDoUpdate({
        target: problems.problemKey,
        set: {
          title: sql`excluded.title`,
          rating: sql`excluded.rating`,
          tags: sql`excluded.tags`,
          timeLimitMs: sql`excluded.time_limit_ms`,
          memoryLimitMb: sql`excluded.memory_limit_mb`,
          description: sql`excluded.description`,
          inputFormat: sql`excluded.input_format`,
          outputFormat: sql`excluded.output_format`,
          note: sql`excluded.note`,
          examples: sql`excluded.examples`,
          interactive: sql`excluded.interactive`,
          testsComplete: sql`excluded.tests_complete`,
          testCount: sql`excluded.test_count`,
          hasChecker: sql`excluded.has_checker`,
          checkerSource: sql`excluded.checker_source`,
          editorial: sql`excluded.editorial`,
        },
      });

    process.stdout.write(`\r  ↳ Ingested ${Math.min(i + BATCH_SIZE_PROBLEMS, sqliteProblems.length)} / ${sqliteProblems.length} problems`);
  }
  console.log("\nProblems migration finished.");

  console.log("Migrating tests in bulk...");
  const totalTestsRow = sdb.prepare("SELECT count(*) as count FROM tests").get() as { count: number };
  const totalTests = totalTestsRow.count;
  console.log(`Found ${totalTests} tests to migrate.`);

  // 4 parameters per row. 1000 rows = 4000 parameters.
  const BATCH_SIZE_TESTS = 1000;
  let testCountIngested = 0;

  for (let offset = 0; offset < totalTests; offset += BATCH_SIZE_TESTS) {
    const sqliteTests = sdb
      .prepare("SELECT * FROM tests LIMIT ? OFFSET ?")
      .all(BATCH_SIZE_TESTS, offset) as SqliteTest[];

    const insertData = sqliteTests.map(t => ({
      problemKey: t.problem_key,
      testIndex: t.test_index,
      input: t.input,
      output: t.output,
    }));

    await db
      .insert(tests)
      .values(insertData)
      .onConflictDoNothing();

    testCountIngested += sqliteTests.length;
    process.stdout.write(`\r  ↳ Ingested ${testCountIngested} / ${totalTests} tests`);
  }

  console.log("\nTests migration finished successfully!");
  process.exit(0);
}

main().catch((e) => {
  console.error("Migration failed:", e);
  process.exit(1);
});
