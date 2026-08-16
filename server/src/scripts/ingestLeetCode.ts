/**
 * One-time ingestion of newfacade/LeetCodeDataset (~2,800 LC problems
 * with 100+ test cases each) into Neon PostgreSQL via Drizzle ORM.
 *
 * Uses the HuggingFace datasets-server /rows API to paginate through
 * all rows without downloading parquet files.
 *
 * Usage:
 *   DATABASE_URL="postgresql://..." npx tsx src/scripts/ingestLeetCode.ts
 *
 * Or add to package.json scripts:
 *   "ingest:lc": "tsx src/scripts/ingestLeetCode.ts"
 */
import "dotenv/config";
import { gzipSync } from "node:zlib";
import { eq, sql } from "drizzle-orm";
import { dbLC as db } from "../db/index.js";
import { problems, tests, ingestMeta } from "../db/schema.js";

const DATASET = "newfacade/LeetCodeDataset";
const CONFIG = "default";
const SPLIT = "train";
const PAGE_SIZE = 100; // rows per API call (max 100)
const HF_ROWS_URL = "https://datasets-server.huggingface.co/rows";

const FORCE = process.argv.includes("--force");

interface LCRow {
  task_id: string;       // slug like "two-sum"
  query: string;         // clean markdown problem description
  test_list: string[];   // ["assert Solution().twoSum([2,7,11,15], 9) == [0,1]", ...]
  difficulty: string;    // "Easy" | "Medium" | "Hard"
  entry_point: string;   // function name
  tags?: string[];
  prompt?: string;       // sometimes present
}

function difficultyToRating(d: string): number | null {
  switch (d) {
    case "Easy": return 1200;
    case "Medium": return 1600;
    case "Hard": return 2100;
    default: return null;
  }
}

function slugToTitle(slug: string): string {
  return slug
    .split("-")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

/**
 * Parse LeetCode assertion strings into input/output pairs.
 * Format: "assert Solution().twoSum([2,7,11,15], 9) == [0,1]"
 */
function parseTestList(testList: string[]): { input: string; output: string }[] {
  const results: { input: string; output: string }[] = [];
  for (const assertion of testList) {
    const s = String(assertion).trim();
    // Match: assert func(args) == expected
    const m = s.match(/assert\s+\S+?\.\s*\S+?\((.+?)\)\s*==\s*(.+)$/);
    if (m) {
      results.push({ input: m[1].trim(), output: m[2].trim() });
    } else {
      // Fallback: try simpler pattern "assert func(args) == expected"
      const m2 = s.match(/assert\s+\S+?\((.+?)\)\s*==\s*(.+)$/);
      if (m2) {
        results.push({ input: m2[1].trim(), output: m2[2].trim() });
      } else if (s.includes("==")) {
        const parts = s.split("==");
        results.push({ input: parts[0].trim(), output: parts[1].trim() });
      }
    }
  }
  return results;
}

async function fetchPage(offset: number): Promise<{ rows: LCRow[]; total: number }> {
  const url =
    `${HF_ROWS_URL}?dataset=${encodeURIComponent(DATASET)}` +
    `&config=${CONFIG}&split=${SPLIT}` +
    `&offset=${offset}&length=${PAGE_SIZE}`;

  const res = await fetch(url, { signal: AbortSignal.timeout(30000) });
  if (!res.ok) {
    throw new Error(`HF API error ${res.status}: ${await res.text()}`);
  }
  const body = (await res.json()) as any;
  const total = body.num_rows_total ?? 0;
  const rows = (body.rows ?? []).map((r: any) => r.row as LCRow);
  return { rows, total };
}

async function main() {
  console.log(`Ingesting ${DATASET} → Neon PostgreSQL…\n`);

  // Check if already done
  const metaRow = await db
    .select({ status: ingestMeta.status, rows: ingestMeta.rows })
    .from(ingestMeta)
    .where(eq(ingestMeta.file, `leetcode-dataset`))
    .limit(1);

  if (metaRow[0]?.status === "done" && !FORCE) {
    console.log(`Already ingested (${metaRow[0].rows} problems). Use --force to re-ingest.`);
    process.exit(0);
  }

  let offset = 0;
  let totalRows = 0;
  let insertedCount = 0;
  let skippedCount = 0;
  let totalExpected = 0;

  // Paginate through all rows
  while (true) {
    try {
      const { rows, total } = await fetchPage(offset);
      totalExpected = total;

      if (rows.length === 0) break;

      // Process batch in a transaction
      await db.transaction(async (tx) => {
        for (const row of rows) {
          const slug = row.task_id?.trim();
          if (!slug) {
            skippedCount++;
            continue;
          }

          // Use "LC-{slug}" as key to distinguish from CF keys
          const key = `LC-${slug}`;
          const description = row.query ?? row.prompt ?? "";
          const testCases = parseTestList(row.test_list ?? []);
          const rating = difficultyToRating(row.difficulty);
          const tags = Array.isArray(row.tags) ? row.tags : [];

          // Build examples from first 3 test cases
          const examples = testCases.slice(0, 3).map((t) => ({
            input: t.input,
            output: t.output,
          }));

          const storeTests = testCases.length > 0;

          await tx
            .insert(problems)
            .values({
              problemKey: key,
              contestId: 0, // LC doesn't have contest IDs in this context
              problemIndex: slug,
              title: slugToTitle(slug),
              rating,
              tags,
              timeLimitMs: 2000,
              memoryLimitMb: 256,
              description,
              inputFormat: null,
              outputFormat: null,
              note: null,
              examples,
              interactive: false,
              testsComplete: storeTests,
              testCount: storeTests ? testCases.length : 0,
              hasChecker: false,
              checkerSource: null,
              editorial: null,
            })
            .onConflictDoUpdate({
              target: problems.problemKey,
              set: {
                title: sql`excluded.title`,
                rating: sql`excluded.rating`,
                tags: sql`excluded.tags`,
                description: sql`excluded.description`,
                examples: sql`excluded.examples`,
                testsComplete: sql`excluded.tests_complete`,
                testCount: sql`excluded.test_count`,
              },
            });

          // Insert test cases (gzip compressed, same as CF)
          if (storeTests) {
            await tx.delete(tests).where(eq(tests.problemKey, key));
            for (let i = 0; i < testCases.length; i++) {
              await tx.insert(tests).values({
                problemKey: key,
                testIndex: i,
                input: gzipSync(testCases[i].input) as unknown as Buffer,
                output: gzipSync(testCases[i].output) as unknown as Buffer,
              });
            }
          }

          insertedCount++;
        }
      });

      totalRows += rows.length;
      process.stdout.write(
        `\r  ↳ ${totalRows}/${totalExpected} rows processed (${insertedCount} inserted, ${skippedCount} skipped)`
      );

      offset += PAGE_SIZE;

      // Small delay to be nice to HF API
      await new Promise((r) => setTimeout(r, 500));
    } catch (err) {
      console.error(`\n\nError at offset ${offset}:`, err);
      console.log(`Retrying in 5 seconds...`);
      await new Promise((r) => setTimeout(r, 5000));
      // Don't increment offset — retry same page
    }
  }

  console.log(
    `\n\nDone. ${insertedCount} LeetCode problems ingested with test cases.`
  );

  // Mark as done in ingest_meta
  await db
    .insert(ingestMeta)
    .values({
      file: "leetcode-dataset",
      status: "done",
      rows: insertedCount,
      ingestedAt: new Date(),
    })
    .onConflictDoUpdate({
      target: ingestMeta.file,
      set: {
        status: sql`excluded.status`,
        rows: sql`excluded.rows`,
        ingestedAt: sql`excluded.ingested_at`,
      },
    });

  // Print stats
  const problemCount = await db
    .select({ count: sql<number>`COUNT(*)::int` })
    .from(problems);
  const testCount = await db
    .select({ count: sql<number>`COUNT(*)::int` })
    .from(tests);

  console.log(
    `Total in DB: ${problemCount[0].count} problems, ${testCount[0].count} test rows.`
  );

  process.exit(0);
}

main().catch((e) => {
  console.error("\nIngestion failed:", e);
  process.exit(1);
});
