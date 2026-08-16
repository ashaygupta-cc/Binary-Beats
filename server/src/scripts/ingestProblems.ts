/**
 * One-time (resumable) ingestion of the open-r1/codeforces dataset
 * (https://huggingface.co/datasets/open-r1/codeforces, ODC-By 4.0)
 * into Neon PostgreSQL via Drizzle ORM.
 *
 * Usage: npm run ingest        (add --force to re-ingest already-done files)
 */
import "dotenv/config";
import { createWriteStream, existsSync, mkdirSync, renameSync, statSync } from "node:fs";
import { pipeline } from "node:stream/promises";
import { Readable } from "node:stream";
import { gzipSync } from "node:zlib";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { asyncBufferFromFile, parquetMetadataAsync, parquetReadObjects } from "hyparquet";
import { compressors } from "hyparquet-compressors";
import { eq, sql } from "drizzle-orm";
import { db } from "../db/index.js";
import { problems, tests, ingestMeta } from "../db/schema.js";

const DATA_DIR = fileURLToPath(new URL("../../data", import.meta.url));
const PARQUET_DIR = path.join(DATA_DIR, "parquet");

const HF_BASE = "https://huggingface.co/datasets/open-r1/codeforces/resolve/main/data";
const FILES = [
  ...Array.from({ length: 11 }, (_, i) => `train-${String(i).padStart(5, "0")}-of-00011.parquet`),
  "test-00000-of-00001.parquet",
];

const COLUMNS = [
  "contest_id",
  "index",
  "title",
  "rating",
  "tags",
  "time_limit",
  "memory_limit",
  "description",
  "input_format",
  "output_format",
  "interaction_format",
  "note",
  "examples",
  "editorial",
  "official_tests",
  "official_tests_complete",
  "input_mode",
  "generated_checker",
];

const ROW_WINDOW = 50;
const BATCH_SIZE = 25; // insert this many problems per DB transaction

const FORCE = process.argv.includes("--force");

interface DatasetRow {
  contest_id: string;
  index: string;
  title: string | null;
  rating: number | bigint | null;
  tags: string[] | null;
  time_limit: number | null;
  memory_limit: number | null;
  description: string | null;
  input_format: string | null;
  output_format: string | null;
  interaction_format: string | null;
  note: string | null;
  examples: { input: string; output: string }[] | null;
  editorial: string | null;
  official_tests: { input: string; output: string }[] | null;
  official_tests_complete: boolean | null;
  input_mode: string | null;
  generated_checker: string | null;
}

async function download(file: string): Promise<string> {
  mkdirSync(PARQUET_DIR, { recursive: true });
  const url = `${HF_BASE}/${file}`;
  const dest = path.join(PARQUET_DIR, file);

  const head = await fetch(url, { method: "HEAD", redirect: "follow" });
  if (!head.ok) throw new Error(`HEAD ${url} → ${head.status}`);
  const expected = Number(head.headers.get("content-length") ?? 0);

  if (existsSync(dest) && expected > 0 && statSync(dest).size === expected) {
    console.log(`  ↳ ${file} already downloaded (${(expected / 1e6).toFixed(0)} MB), skipping`);
    return dest;
  }

  console.log(`  ↳ downloading ${file} (${(expected / 1e6).toFixed(0)} MB)…`);
  const res = await fetch(url, { redirect: "follow" });
  if (!res.ok || !res.body) throw new Error(`GET ${url} → ${res.status}`);
  const part = `${dest}.part`;
  await pipeline(Readable.fromWeb(res.body as import("node:stream/web").ReadableStream), createWriteStream(part));
  renameSync(part, dest);
  return dest;
}

function normText(v: string | null | undefined): string | null {
  const t = typeof v === "string" ? v.trim() : "";
  return t.length > 0 ? t : null;
}

async function ingestFile(filePath: string, fileName: string) {
  const doneRow = await db
    .select({ status: ingestMeta.status })
    .from(ingestMeta)
    .where(eq(ingestMeta.file, fileName))
    .limit(1);

  if (doneRow[0]?.status === "done" && !FORCE) {
    console.log(`  ↳ ${fileName} already ingested, skipping`);
    return;
  }

  const file = await asyncBufferFromFile(filePath);
  const metadata = await parquetMetadataAsync(file);

  let totalRows = 0;
  let groupStart = 0;

  for (const group of metadata.row_groups) {
    const groupRows = Number(group.num_rows);
    for (let offset = 0; offset < groupRows; offset += ROW_WINDOW) {
      const rowStart = groupStart + offset;
      const rowEnd = groupStart + Math.min(offset + ROW_WINDOW, groupRows);
      const rows = (await parquetReadObjects({
        file,
        metadata,
        compressors,
        columns: COLUMNS,
        rowStart,
        rowEnd,
      })) as unknown as DatasetRow[];

      // Process rows in smaller batches to avoid huge single transactions
      for (let b = 0; b < rows.length; b += BATCH_SIZE) {
        const batch = rows.slice(b, b + BATCH_SIZE);
        await db.transaction(async (tx) => {
          for (const row of batch) {
            const contestId = Number.parseInt(String(row.contest_id), 10);
            const index = String(row.index ?? "").toUpperCase();
            if (!Number.isFinite(contestId) || contestId <= 0 || !index) continue;
            const key = `${contestId}-${index}`;

            const tags = Array.isArray(row.tags) ? row.tags.map(String) : [];
            const interactive =
              normText(row.interaction_format) !== null ||
              tags.includes("interactive") ||
              (normText(row.input_mode) !== null && row.input_mode !== "stdio");
            const officialTests = Array.isArray(row.official_tests) ? row.official_tests : [];
            const storeTests = row.official_tests_complete === true && !interactive && officialTests.length > 0;
            const checker = normText(row.generated_checker);
            const examples = Array.isArray(row.examples)
              ? row.examples.map((e) => ({ input: String(e.input ?? ""), output: String(e.output ?? "") }))
              : [];

            await tx
              .insert(problems)
              .values({
                problemKey: key,
                contestId,
                problemIndex: index,
                title: normText(row.title),
                rating: row.rating == null ? null : Number(row.rating),
                tags,
                timeLimitMs: row.time_limit == null ? null : Math.round(Number(row.time_limit) * 1000),
                memoryLimitMb: row.memory_limit == null ? null : Math.round(Number(row.memory_limit)),
                description: normText(row.description),
                inputFormat: normText(row.input_format),
                outputFormat: normText(row.output_format),
                note: normText(row.note),
                examples,
                interactive,
                testsComplete: storeTests,
                testCount: storeTests ? officialTests.length : 0,
                hasChecker: !!checker,
                checkerSource: checker ? gzipSync(checker) : null,
                editorial: normText(row.editorial),
              })
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

            if (storeTests) {
              // Delete old tests then bulk-insert new ones
              await tx.delete(tests).where(eq(tests.problemKey, key));
              for (let i = 0; i < officialTests.length; i++) {
                await tx.insert(tests).values({
                  problemKey: key,
                  testIndex: i,
                  input: gzipSync(String(officialTests[i].input ?? "")) as unknown as Buffer,
                  output: gzipSync(String(officialTests[i].output ?? "")) as unknown as Buffer,
                });
              }
            }

            totalRows++;
          }
        });
      }

      process.stdout.write(`\r  ↳ ${fileName}: ${totalRows} rows ingested`);
    }
    groupStart += groupRows;
  }
  console.log();

  await db
    .insert(ingestMeta)
    .values({ file: fileName, status: "done", rows: totalRows, ingestedAt: new Date() })
    .onConflictDoUpdate({
      target: ingestMeta.file,
      set: {
        status: sql`excluded.status`,
        rows: sql`excluded.rows`,
        ingestedAt: sql`excluded.ingested_at`,
      },
    });
}

async function main() {
  console.log("Ingesting open-r1/codeforces dataset (ODC-By 4.0) → Neon PostgreSQL…");

  for (const fileName of FILES) {
    console.log(`\n${fileName}`);
    const filePath = await download(fileName);
    await ingestFile(filePath, fileName);
  }

  const problemCount = await db
    .select({ count: sql<number>`COUNT(*)::int` })
    .from(problems);
  const judgeableCount = await db
    .select({ count: sql<number>`COUNT(*)::int` })
    .from(problems)
    .where(eq(problems.testsComplete, true));
  const testCount = await db
    .select({ count: sql<number>`COUNT(*)::int` })
    .from(tests);

  console.log(`\nDone. ${problemCount[0].count} problems (${judgeableCount[0].count} with complete test suites), ${testCount[0].count} stored tests.`);
  console.log(`The parquet files in ${PARQUET_DIR} are no longer needed and can be deleted.`);
  process.exit(0);
}

main().catch((e) => {
  console.error("\nIngestion failed:", e);
  process.exit(1);
});
