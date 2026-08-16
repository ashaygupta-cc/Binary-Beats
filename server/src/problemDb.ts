/**
 * Problem data access layer — now backed by Neon (PostgreSQL) via Drizzle ORM.
 * Public API is unchanged from the SQLite version so route files need no edits.
 *
 * All functions are now async. The route files that call them must await.
 */
import { gunzipSync } from "node:zlib";
import { eq, and, sql, ilike, gte, lte, inArray } from "drizzle-orm";
import { db, dbLC } from "./db/index.js";
import { problems, tests } from "./db/schema.js";
import { fetchOfficialTestsFromHF } from "./hfTestFetch.js";

export interface ProblemStatement {
  key: string;
  contestId: number;
  index: string;
  title: string | null;
  rating: number | null;
  tags: string[];
  timeLimitMs: number | null;
  memoryLimitMb: number | null;
  description: string | null;
  inputFormat: string | null;
  outputFormat: string | null;
  note: string | null;
  examples: { input: string; output: string }[];
  interactive: boolean;
  judgeable: boolean;
  /** Count of official hidden tests Submit judges against — 0 when not judgeable.
   *  Never the test content itself, that stays server-side. */
  testCount: number;
  /** "codeforces" | "leetcode" | "atcoder" | "codechef" | ... — always set
   *  server-side from a trustworthy source (the local table, which is CF-only,
   *  or the HARDTESTS dataset's own `platform` column). The frontend must
   *  never re-derive this by guessing from the key string. */
  platform: string;
}

export interface JudgeInfo {
  timeLimitMs: number;
  memoryLimitMb: number;
  testCount: number;
  hasChecker: boolean;
}

export interface ProblemListResult {
  problems: ProblemStatement[];
  total: number;
  page: number;
  pages: number;
}

function rowIsJudgeable(row: { testsComplete: boolean; interactive: boolean; hasChecker: boolean }): boolean {
  return row.testsComplete && !row.interactive && !row.hasChecker;
}

// ── CF key format reconciliation ────────────────────────────────────────────
// The locally-ingested 9931-problem Codeforces table (see scripts/ingestProblems.ts)
// stores keys as "1500-A" (dashed). The Daily Problems bot feed, on the other
// hand, hands us CF problem ids as "1500A" (no dash) — same convention as
// LeetCode/AtCoder/CodeChef ids. Without reconciling the two, every CF daily
// problem misses the local table and falls through to the (slower) Hugging
// Face lookup even though it's almost always already sitting in Postgres with
// its real official tests. Every DB lookup below tries both spellings.
function localKeyCandidates(key: string): string[] {
  const upperKey = key.toUpperCase();
  const lowerKey = key.toLowerCase();
  const rawKey = key.replace(/^LC-/i, "");
  const candidates = [key, upperKey, lowerKey, rawKey];

  // CF: "1500A" ↔ "1500-A"
  const undashed = upperKey.match(/^(\d+)([A-Z]\d?)$/);
  if (undashed) candidates.push(`${undashed[1]}-${undashed[2]}`);
  const dashed = upperKey.match(/^(\d+)-([A-Z]\d?)$/);
  if (dashed) candidates.push(`${dashed[1]}${dashed[2]}`);

  // LC: "3sum" / "two-sum" -> "LC-3sum" / "3sum"
  candidates.push(`LC-${rawKey.toLowerCase()}`);
  candidates.push(`LC-${rawKey.toUpperCase()}`);
  candidates.push(rawKey.toLowerCase());

  return [...new Set(candidates)];
}

function toStatement(row: typeof problems.$inferSelect): ProblemStatement {
  return {
    key: row.problemKey,
    contestId: row.contestId,
    index: row.problemIndex,
    title: row.title,
    rating: row.rating,
    tags: (row.tags as string[]) ?? [],
    timeLimitMs: row.timeLimitMs,
    memoryLimitMb: row.memoryLimitMb,
    description: row.description,
    inputFormat: row.inputFormat,
    outputFormat: row.outputFormat,
    note: row.note,
    examples: (row.examples as { input: string; output: string }[]) ?? [],
    interactive: row.interactive,
    judgeable: rowIsJudgeable(row),
    testCount: rowIsJudgeable(row) ? row.testCount : 0,
    platform: row.problemKey.startsWith("LC-") ? "leetcode" : "codeforces",
  };
}

const HARDTESTS_FILTER_URL = "https://datasets-server.huggingface.co/filter";
const HARDTESTS_PROBLEMS_DATASET = "sigcp/hardtests_problems";
const LEETCODE_DATASET = "newfacade/LeetCodeDataset";
const BOT_API_URL = (process.env.BOT_API_URL ?? "").replace(/\/+$/, "");
const BB_API_KEY = process.env.BB_API_KEY ?? "";

function escapeSqlString(v: string): string {
  return v.replace(/'/g, "''");
}

// ── Dedicated LeetCode dataset lookup (newfacade/LeetCodeDataset) ───────────
// This dataset has ~2800 LC problems with clean markdown descriptions (field
// `query`) and 100+ test assertions each (field `test_list`). Much better
function cleanLeetCodeDescription(raw: string): string {
  if (!raw) return "";
  let text = raw;

  // Convert HTML <sup>31</sup> -> ^31 and <sub>x</sub> -> _x so math bounds aren't squished (e.g. 2<sup>31</sup> -> 2^31)
  text = text.replace(/<sup>([\s\S]*?)<\/sup>/gi, "^$1");
  text = text.replace(/<sub>([\s\S]*?)<\/sub>/gi, "_$1");

  // Fix raw integer power bound artifacts in dataset (e.g. -231 -> -2^31, 231 -> 2^31, 109 -> 10^9, 105 -> 10^5)
  text = text.replace(/([-\s(<]|\b)231\b/g, "$12^31");
  text = text.replace(/([-\s(<]|\b)230\b/g, "$12^30");
  text = text.replace(/([-\s(<]|\b)109\b/g, "$110^9");
  text = text.replace(/([-\s(<]|\b)105\b/g, "$110^5");
  text = text.replace(/([-\s(<]|\b)104\b/g, "$110^4");

  // Remove "You are an expert Python/C++ programmer..." system prompt prefixes
  text = text.replace(/^[\s\n]*You are an? expert [^\n]+\.?\s*/gi, "");
  text = text.replace(/^[\s\n]*As an? expert [^\n]+\.?\s*/gi, "");
  text = text.replace(/^[\s\n]*Please write a (python|c\+\+|java|solution)[^\n]+\.?\s*/gi, "");
  text = text.replace(/^[\s\n]*Write a (python|c\+\+|java) function[^\n]+\.?\s*/gi, "");

  // Remove "### Question:" header
  text = text.replace(/^[\s\n]*###?\s*Question:\s*/gi, "");

  // Remove trailing "### Format: You will use the following starter code..." LLM instructions
  text = text.replace(/###?\s*Format:[\s\S]*$/gi, "");
  text = text.replace(/Format: You will use the following starter code[\s\S]*$/gi, "");

  // Remove solution code blocks appended by LLM prompts
  text = text.replace(/###?\s*(Solution|Answer|Python Solution|C\+\+ Solution)[\s\S]*$/gi, "");
  text = text.replace(/```(python|cpp|c\+\+|java)[\s\S]*?```/gi, "");

  return text.replace(/\n{3,}/g, "\n\n").trim();
}

// quality than sigcp/hardtests_problems for LeetCode specifically.
// The `task_id` field is the LC slug (e.g. "two-sum") matching the URL.
async function queryLeetCodeDataset(slug: string): Promise<{
  description: string;
  tests: { input: string; output: string }[];
  difficulty: string | null;
  tags: string[];
} | undefined> {
  const where = `"task_id"='${escapeSqlString(slug.toLowerCase())}'`;
  const url =
    `${HARDTESTS_FILTER_URL}?dataset=${encodeURIComponent(LEETCODE_DATASET)}&config=default&split=train` +
    `&where=${encodeURIComponent(where)}&length=1`;

  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(3000) });
    if (!res.ok) return undefined;
    const body = await res.json() as any;
    const row = body.rows?.[0]?.row;
    if (!row) return undefined;

    // `query` is a clean markdown problem description including examples
    const rawDesc = row.query ?? row.prompt ?? "";
    const description = cleanLeetCodeDescription(rawDesc);

    // `test_list` is an array of Python assertion strings like:
    //   "assert Solution().twoSum([2,7,11,15], 9) == [0,1]"
    // We parse these into input/output pairs for the judge display.
    const tests: { input: string; output: string }[] = [];
    if (Array.isArray(row.test_list)) {
      for (const assertion of row.test_list) {
        const s = String(assertion);
        // Parse "assert func(args) == expected" format
        const m = s.match(/assert\s+\S+?\((.+?)\)\s*==\s*(.+)$/);
        if (m) {
          tests.push({ input: m[1].trim(), output: m[2].trim() });
        } else {
          tests.push({ input: s, output: "" });
        }
      }
    }

    return {
      description,
      tests,
      difficulty: row.difficulty ?? null,
      tags: Array.isArray(row.tags) ? row.tags : [],
    };
  } catch (err) {
    console.error(`[LC-Dataset] Error querying for ${slug}:`, err);
    return undefined;
  }
}

/** Mirrors the frontend's getProblemExternalUrl (src/components/solve/types.ts)
 *  so we can match Hugging Face's `url` column against the same canonical
 *  external URL a user would actually visit — far more reliable than
 *  guessing HARDTESTS' internal `pid` naming per platform. */
function externalUrlFor(platform: string, key: string): string {
  const id = key.toLowerCase();
  switch (platform) {
    case "leetcode":
      return `https://leetcode.com/problems/${id}/`;
    case "atcoder":
      return `https://atcoder.jp/contests/${id.split("_")[0]}/tasks/${id}`;
    case "codechef":
      return `https://www.codechef.com/problems/${id}`;
    case "codeforces":
    default: {
      const m = id.match(/^(\d+)-([a-z]\d?)$/i) || id.match(/^(\d+)([a-z]\d?)$/i);
      if (m) return `https://codeforces.com/problemset/problem/${m[1]}/${m[2].toUpperCase()}`;
      return `https://codeforces.com/`;
    }
  }
}

async function queryFilterHardtestsWhere(where: string): Promise<any | undefined> {
  const url =
    `${HARDTESTS_FILTER_URL}?dataset=${encodeURIComponent(HARDTESTS_PROBLEMS_DATASET)}&config=default&split=train` +
    `&where=${encodeURIComponent(where)}&length=1`;

  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(12000) });
    if (res.ok) {
      const body = await res.json() as any;
      if (!body.error && body.rows?.[0]?.row) return body.rows[0].row;
    }
  } catch (err) {
    console.error(`Error querying HARDTESTS (${where}):`, err);
  }
  return undefined;
}

function queryFilterHardtestsByPid(pid: string): Promise<any | undefined> {
  return queryFilterHardtestsWhere(`"pid"='${escapeSqlString(pid)}'`);
}

/** LIKE-match on the dataset's own `url` column against the real external
 *  problem URL. Robust to whatever internal `pid` convention HARDTESTS
 *  happens to use for a given source OJ (confirmed via the dataset's public
 *  schema/viewer: `url` always holds the canonical link, e.g.
 *  "https://atcoder.jp/contests/abc001/tasks/abc001_2"). */
function queryFilterHardtestsByUrl(urlFragment: string): Promise<any | undefined> {
  return queryFilterHardtestsWhere(`"url" LIKE '%${escapeSqlString(urlFragment)}%'`);
}

async function recoverHardtestsFromBot(pid: string): Promise<{ input: string; output: string }[] | undefined> {
  if (!BOT_API_URL) return undefined;
  const url = `${BOT_API_URL}/api/internal/hardtests/${encodeURIComponent(pid)}`;
  try {
    const res = await fetch(url, {
      headers: BB_API_KEY ? { "X-BB-Key": BB_API_KEY } : {},
      signal: AbortSignal.timeout(20000),
    });
    if (res.ok) {
      const body = await res.json() as any;
      if (Array.isArray(body.tests)) {
        return body.tests.map((t: any) => ({
          input: String(t.input ?? ""),
          output: String(t.output ?? ""),
        }));
      }
    }
  } catch (err) {
    console.error(`Error recovering hardtests from bot for ${pid}:`, err);
  }
  return undefined;
}

const hfMissingKeys = new Set<string>();
const KNOWN_PLATFORMS = ["codeforces", "leetcode", "atcoder", "codechef"] as const;

// Full resolved-row cache — a daily problem is typically opened by many
// people over the course of a day, so without this every single one of them
// would re-trigger a fresh round trip to datasets-server.huggingface.co for
// content that never changes once fetched. Capped by entry count (rows are a
// few KB each; a few thousand entries is a trivial memory footprint) with
// simple FIFO eviction — same pattern as the tests cache below.
type ResolvedHardtests = { row: any; pid: string; tests: { input: string; output: string }[] };
const HF_RESOLVED_CACHE_MAX_ENTRIES = 4000;
const hfResolvedCache = new Map<string, ResolvedHardtests>();
const hfResolvedInFlight = new Map<string, Promise<ResolvedHardtests | undefined>>();

function cacheResolved(cacheKey: string, data: ResolvedHardtests): void {
  if (hfResolvedCache.size >= HF_RESOLVED_CACHE_MAX_ENTRIES) {
    const oldestKey = hfResolvedCache.keys().next().value as string;
    hfResolvedCache.delete(oldestKey);
  }
  hfResolvedCache.set(cacheKey, data);
}

async function resolveHardtestsData(
  key: string,
  platformHint?: string
): Promise<ResolvedHardtests | undefined> {
  const upperKey = key.toUpperCase();
  const hint = platformHint?.toLowerCase();
  const cacheKey = hint ? `${hint}:${upperKey}` : upperKey;
  if (hfMissingKeys.has(cacheKey)) return undefined;

  const cached = hfResolvedCache.get(cacheKey);
  if (cached) return cached;

  // Coalesce concurrent requests for the same problem (e.g. several people
  // opening the same daily problem at once) into a single in-flight fetch
  // rather than firing off duplicate HF queries for each one.
  const existing = hfResolvedInFlight.get(cacheKey);
  if (existing) return existing;

  const promise = (async (): Promise<ResolvedHardtests | undefined> => {
    const lowerKey = key.toLowerCase();
    const platforms = hint && (KNOWN_PLATFORMS as readonly string[]).includes(hint) ? [hint] : KNOWN_PLATFORMS;

    // Two lookup strategies per candidate platform, run concurrently:
    //  1. pid guess `${platform}_${key}` — cheap, exact, works when HARDTESTS'
    //     pid mirrors the source's own native id (confirmed for AtCoder, e.g.
    //     "atcoder_abc001_2").
    //  2. url LIKE match against the platform's real external problem URL —
    //     robust fallback for platforms (LeetCode, CodeChef) whose pid scheme
    //     isn't a simple `${platform}_` prefix of the URL slug, since HARDTESTS
    //     sources those indirectly via TACO/CodeContests with unpredictable ids.
    // When the caller knows the platform (the normal case — daily problems and
    // the practice list both carry it), only that one platform is queried
    // instead of blindly trying all four — faster and avoids false hits.
    const lookups: Promise<any | undefined>[] = [];
    for (const p of platforms) {
      lookups.push(queryFilterHardtestsByPid(`${p}_${lowerKey}`));
      lookups.push(queryFilterHardtestsByUrl(externalUrlFor(p, lowerKey).replace(/^https?:\/\//, "").replace(/\/$/, "")));
    }
    // Bare pid (no platform prefix) as a last-resort catch-all — some entries
    // (mainly Codeforces, via CodeContests merge) use the raw id with no prefix.
    if (!hint) lookups.push(queryFilterHardtestsByPid(lowerKey));

    // Race to first successful result — don't wait for ALL queries to
    // complete (or timeout). If any lookup finds the row, return it
    // immediately. If all fail, mark as missing.
    let foundRow: any;
    try {
      foundRow = await Promise.any(
        lookups.map(p => p.then(r => { if (r) return r; throw new Error("empty"); }))
      );
    } catch {
      // All lookups returned undefined or errored
      foundRow = undefined;
    }

    if (!foundRow) {
      hfMissingKeys.add(cacheKey);
      return undefined;
    }

    const pid = foundRow.pid;
    let tests: { input: string; output: string }[] = [];
    const botTests = await recoverHardtestsFromBot(pid);
    if (botTests && botTests.length > 0) {
      tests = botTests;
    } else {
      tests = Array.isArray(foundRow.public_test_cases)
        ? foundRow.public_test_cases.map((t: any) => ({
            input: String(t.input ?? ""),
            output: String(t.output ?? ""),
          }))
        : [];
    }

    const resolved = { row: foundRow, pid, tests };
    cacheResolved(cacheKey, resolved);
    return resolved;
  })();

  hfResolvedInFlight.set(cacheKey, promise);
  try {
    return await promise;
  } finally {
    hfResolvedInFlight.delete(cacheKey);
  }
}

const statementMemoryCache = new Map<string, ProblemStatement>();

export async function getStatement(key: string, platformHint?: string): Promise<ProblemStatement | undefined> {
  const cacheKey = `${platformHint ?? ""}:${key.toLowerCase()}`;
  if (statementMemoryCache.has(cacheKey)) {
    return statementMemoryCache.get(cacheKey);
  }

  const upperKey = key.toUpperCase();
  const candidates = localKeyCandidates(key);

  // Check CF database first
  const rows = await db
    .select()
    .from(problems)
    .where(inArray(problems.problemKey, candidates))
    .limit(1);
  if (rows[0]) {
    const stmt = toStatement(rows[0]);
    statementMemoryCache.set(cacheKey, stmt);
    return stmt;
  }

  // Check LC database (separate Neon project)
  const lcRows = await dbLC
    .select()
    .from(problems)
    .where(inArray(problems.problemKey, candidates))
    .limit(1);
  if (lcRows[0]) {
    const stmt = toStatement(lcRows[0]);
    statementMemoryCache.set(cacheKey, stmt);
    return stmt;
  }

  const hint = platformHint?.toLowerCase();

  // ── Dedicated LeetCode dataset (newfacade/LeetCodeDataset) ──────────
  // Try this FIRST for LeetCode — it has clean markdown statements and
  // 100+ test cases per problem, far better than sigcp/hardtests_problems.
  const isLcHint = hint === "leetcode" || hint === "lc";
  if (isLcHint || (!hint && key.match(/^[a-z0-9-]+$/i))) {
    const slug = key.toLowerCase().replace(/^lc-/, "");
    const lcData = await queryLeetCodeDataset(slug);
    if (lcData) {
      if (lcData.tests.length > 0) cacheHfTests(upperKey, lcData.tests);

      // Extract examples from the first few test cases for display
      const displayExamples = lcData.tests.slice(0, 3);

      const stmt: ProblemStatement = {
        key: upperKey,
        contestId: 0,
        index: "",
        title: key.split("-").map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(" "),
        rating: lcData.difficulty === "Easy" ? 1200 : lcData.difficulty === "Medium" ? 1600 : lcData.difficulty === "Hard" ? 2100 : null,
        tags: lcData.tags,
        timeLimitMs: 2000,
        memoryLimitMb: 256,
        description: lcData.description,
        inputFormat: "",
        outputFormat: "",
        note: "",
        examples: displayExamples,
        interactive: false,
        judgeable: lcData.tests.length > 0,
        testCount: lcData.tests.length,
        platform: "leetcode",
      };
      statementMemoryCache.set(cacheKey, stmt);
      return stmt;
    }
    // If dedicated LC dataset doesn't have it, don't waste time trying
    // HARDTESTS (it won't have better data for LC, and each query risks
    // a timeout). Mark as missing and return fast.
    if (isLcHint) {
      hfMissingKeys.add(`leetcode:${upperKey}`);
      return undefined;
    }
  }

  // ── Generic HARDTESTS fallback (sigcp/hardtests_problems) ───────────
  const res = await resolveHardtestsData(key, platformHint);
  if (!res) return undefined;

  const { row, tests } = res;

  const examples = Array.isArray(row.public_test_cases)
    ? row.public_test_cases.map((t: any) => ({
        input: String(t.input ?? ""),
        output: String(t.output ?? ""),
      }))
    : [];

  const limits = Array.isArray(row.public_test_cases) && row.public_test_cases[0]
    ? {
        timeLimitMs: Math.round(Number(row.public_test_cases[0].time_limit) * 1000) || 2000,
        memoryLimitMb: Math.round(Number(row.public_test_cases[0].memory_limit)) || 256,
      }
    : { timeLimitMs: 2000, memoryLimitMb: 256 };

  let rating: number | null = null;
  if (Array.isArray(row.difficulty_ratings)) {
    for (const d of row.difficulty_ratings) {
      if (d.score !== undefined && d.score !== null) {
        rating = Number(d.score);
        break;
      }
    }
  }

  const tags = Array.isArray(row.tags)
    ? row.tags.flatMap((t: any) => (Array.isArray(t.content) ? t.content.map(String) : []))
    : [];

  if (tests.length > 0) {
    cacheHfTests(upperKey, tests);
  }

  let description: string | null = null;
  if (typeof row.content === "string" && row.content.trim()) {
    description = row.content
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/<\/p>/gi, "\n\n")
      .replace(/<\/li>/gi, "\n")
      .replace(/<li>/gi, "• ")
      .replace(/<\/h[1-6]>/gi, "\n")
      .replace(/<h[1-6][^>]*>/gi, "### ")
      .replace(/<pre[^>]*>([\s\S]*?)<\/pre>/gi, "```\n$1\n```")
      .replace(/<code>([\s\S]*?)<\/code>/gi, "`$1`")
      .replace(/<strong>([\s\S]*?)<\/strong>/gi, "**$1**")
      .replace(/<em>([\s\S]*?)<\/em>/gi, "*$1*")
      .replace(/<sup>([\s\S]*?)<\/sup>/gi, "^$1")
      .replace(/<sub>([\s\S]*?)<\/sub>/gi, "_$1")
      .replace(/<[^>]+>/g, "")
      .replace(/&lt;/g, "<").replace(/&gt;/g, ">")
      .replace(/&amp;/g, "&").replace(/&quot;/g, '"')
      .replace(/&nbsp;/g, " ").replace(/&#39;/g, "'")
      .replace(/\n{3,}/g, "\n\n")
      .trim();
  }

  const resolvedPlatform = (typeof row.platform === "string" && row.platform.trim())
    ? row.platform.trim().toLowerCase()
    : (platformHint?.toLowerCase() || "codeforces");

  const hardtestsStmt: ProblemStatement = {
    key: upperKey,
    contestId: 0,
    index: "",
    title: row.question_title || key,
    rating,
    tags,
    timeLimitMs: limits.timeLimitMs,
    memoryLimitMb: limits.memoryLimitMb,
    description: description || "",
    inputFormat: "",
    outputFormat: "",
    note: "",
    examples,
    interactive: false,
    judgeable: tests.length > 0,
    testCount: tests.length,
    platform: resolvedPlatform,
  };

  statementMemoryCache.set(cacheKey, hardtestsStmt);
  return hardtestsStmt;
}

// ── Hugging Face fallback for locally-incomplete "judgeable" problems ───────
// Some problems have `tests_complete = true` (the *source* dataset does have
// a full suite) but ended up with few or no rows in the `tests` table — the
// Neon free tier is already at its 512 MB cap, so a prior bulk migration got
// cut off partway. Rather than growing that table further, missing suites
// are recovered from Hugging Face on demand and cached in memory for the
// life of the process (test content is static, so no TTL is needed — just a
// byte-size cap with FIFO eviction so this can't grow unbounded).
const HF_FALLBACK_CACHE_MAX_BYTES = 64 * 1024 * 1024;
const hfFallbackCache = new Map<string, { input: string; output: string }[]>();
const hfFallbackInFlight = new Map<string, Promise<{ input: string; output: string }[] | undefined>>();
let hfFallbackCacheBytes = 0;

function testsByteSize(list: { input: string; output: string }[]): number {
  let n = 0;
  for (const t of list) n += Buffer.byteLength(t.input, "utf8") + Buffer.byteLength(t.output, "utf8");
  return n;
}

function cacheHfTests(key: string, list: { input: string; output: string }[]): void {
  const bytes = testsByteSize(list);
  while (hfFallbackCacheBytes + bytes > HF_FALLBACK_CACHE_MAX_BYTES && hfFallbackCache.size > 0) {
    const oldestKey = hfFallbackCache.keys().next().value as string;
    hfFallbackCacheBytes -= testsByteSize(hfFallbackCache.get(oldestKey)!);
    hfFallbackCache.delete(oldestKey);
  }
  hfFallbackCache.set(key, list);
  hfFallbackCacheBytes += bytes;
}

async function recoverTestsFromHF(
  key: string,
  contestId: number,
  index: string
): Promise<{ input: string; output: string }[] | undefined> {
  const cached = hfFallbackCache.get(key);
  if (cached) return cached;

  let inFlight = hfFallbackInFlight.get(key);
  if (!inFlight) {
    inFlight = fetchOfficialTestsFromHF(contestId, index).finally(() => hfFallbackInFlight.delete(key));
    hfFallbackInFlight.set(key, inFlight);
  }
  const list = await inFlight;
  if (list && list.length > 0) cacheHfTests(key, list);
  return list;
}

async function getStoredTestCount(key: string): Promise<number> {
  const candidates = localKeyCandidates(key);
  const rows = await db
    .select({ c: sql<number>`COUNT(*)::int` })
    .from(tests)
    .where(inArray(tests.problemKey, candidates));
  if ((rows[0]?.c ?? 0) > 0) return rows[0].c;
  // Check LC database
  const lcRows = await dbLC
    .select({ c: sql<number>`COUNT(*)::int` })
    .from(tests)
    .where(inArray(tests.problemKey, candidates));
  return lcRows[0]?.c ?? 0;
}

export async function getJudgeInfo(key: string, platformHint?: string): Promise<JudgeInfo | undefined> {
  const upperKey = key.toUpperCase();
  const candidates = localKeyCandidates(key);
  const rows = await db
    .select({
      problemKey: problems.problemKey,
      contestId: problems.contestId,
      problemIndex: problems.problemIndex,
      timeLimitMs: problems.timeLimitMs,
      memoryLimitMb: problems.memoryLimitMb,
      testCount: problems.testCount,
      hasChecker: problems.hasChecker,
      testsComplete: problems.testsComplete,
      interactive: problems.interactive,
    })
    .from(problems)
    .where(inArray(problems.problemKey, candidates))
    .limit(1);

  // Check LC database if not found in CF
  let row = rows[0];
  if (!row) {
    const lcRows = await dbLC
      .select({
        problemKey: problems.problemKey,
        contestId: problems.contestId,
        problemIndex: problems.problemIndex,
        timeLimitMs: problems.timeLimitMs,
        memoryLimitMb: problems.memoryLimitMb,
        testCount: problems.testCount,
        hasChecker: problems.hasChecker,
        testsComplete: problems.testsComplete,
        interactive: problems.interactive,
      })
      .from(problems)
      .where(inArray(problems.problemKey, candidates))
      .limit(1);
    row = lcRows[0];
  }
  if (!row) {
    const cached = hfFallbackCache.get(upperKey) || hfFallbackCache.get(key.toLowerCase());
    if (cached) {
      return {
        timeLimitMs: 2000,
        memoryLimitMb: 256,
        testCount: cached.length,
        hasChecker: false,
      };
    }
    const isLc = platformHint?.toLowerCase() === "leetcode" || platformHint?.toLowerCase() === "lc" || key.toLowerCase().startsWith("lc-");
    if (isLc) {
      const slug = key.toLowerCase().replace(/^lc-/, "");
      const lcData = await queryLeetCodeDataset(slug);
      if (lcData && lcData.tests.length > 0) {
        cacheHfTests(upperKey, lcData.tests);
        cacheHfTests(key.toLowerCase(), lcData.tests);
        return {
          timeLimitMs: 2000,
          memoryLimitMb: 256,
          testCount: lcData.tests.length,
          hasChecker: false,
        };
      }
    }
    const res = await resolveHardtestsData(key, platformHint);
    if (!res || res.tests.length === 0) return undefined;
    cacheHfTests(upperKey, res.tests);
    return {
      timeLimitMs: 2000,
      memoryLimitMb: 256,
      testCount: res.tests.length,
      hasChecker: false,
    };
  }

  if (!rowIsJudgeable(row)) return undefined;

  const storedCount = await getStoredTestCount(upperKey);
  if (storedCount >= row.testCount && row.testCount > 0) {
    return {
      timeLimitMs: row.timeLimitMs ?? 2000,
      memoryLimitMb: row.memoryLimitMb ?? 256,
      testCount: row.testCount,
      hasChecker: row.hasChecker,
    };
  }

  const recovered = await recoverTestsFromHF(upperKey, row.contestId, row.problemIndex);
  if (!recovered || recovered.length === 0) return undefined;

  return {
    timeLimitMs: row.timeLimitMs ?? 2000,
    memoryLimitMb: row.memoryLimitMb ?? 256,
    testCount: recovered.length,
    hasChecker: row.hasChecker,
  };
}

/** Fetch and decompress a single official test — served from the Hugging
 *  Face recovery cache when this problem's suite was recovered from there,
 *  otherwise read straight from Postgres. */
export async function getTest(key: string, index: number, platformHint?: string): Promise<{ input: string; output: string } | undefined> {
  const upperKey = key.toUpperCase();
  const lowerKey = key.toLowerCase();
  const cached = hfFallbackCache.get(upperKey) || hfFallbackCache.get(lowerKey);
  if (cached) return cached[index];

  const isLc = platformHint?.toLowerCase() === "leetcode" || platformHint?.toLowerCase() === "lc" || lowerKey.startsWith("lc-");
  if (isLc) {
    const slug = lowerKey.replace(/^lc-/, "");
    const lcData = await queryLeetCodeDataset(slug);
    if (lcData && lcData.tests.length > 0) {
      cacheHfTests(upperKey, lcData.tests);
      cacheHfTests(lowerKey, lcData.tests);
      return lcData.tests[index];
    }
  }

  const candidates = localKeyCandidates(key);
  const rows = await db
    .select({ input: tests.input, output: tests.output })
    .from(tests)
    .where(and(inArray(tests.problemKey, candidates), eq(tests.testIndex, index)))
    .limit(1);

  // Check LC database if not found in CF
  let row = rows[0];
  if (!row) {
    const lcRows = await dbLC
      .select({ input: tests.input, output: tests.output })
      .from(tests)
      .where(and(inArray(tests.problemKey, candidates), eq(tests.testIndex, index)))
      .limit(1);
    row = lcRows[0];
  }
  if (!row) {
    const res = await resolveHardtestsData(key, platformHint);
    if (res && res.tests.length > 0) {
      cacheHfTests(upperKey, res.tests);
      return res.tests[index];
    }
    return undefined;
  }
  return {
    input: gunzipSync(row.input as Buffer).toString("utf8"),
    output: gunzipSync(row.output as Buffer).toString("utf8"),
  };
}

// ── Judgeable key set — cached for 60 s to avoid hot-path DB round-trips ──────

let judgeableKeysCache: Set<string> | null = null;
let judgeableKeysCachedAt = 0;
const CACHE_TTL_MS = 60_000;

export async function getJudgeableKeys(): Promise<Set<string>> {
  const now = Date.now();
  if (judgeableKeysCache && now - judgeableKeysCachedAt < CACHE_TTL_MS) {
    return judgeableKeysCache;
  }
  const rows = await db
    .select({ problemKey: problems.problemKey })
    .from(problems)
    .where(and(eq(problems.testsComplete, true), eq(problems.interactive, false), eq(problems.hasChecker, false)));

  judgeableKeysCache = new Set(rows.map((r) => r.problemKey));
  judgeableKeysCachedAt = now;
  return judgeableKeysCache;
}

export async function isJudgeable(key: string, platformHint?: string): Promise<boolean> {
  const upperKey = key.toUpperCase();
  const lowerKey = key.toLowerCase();
  const keys = await getJudgeableKeys();
  if (localKeyCandidates(key).some((c) => keys.has(c))) return true;

  if (hfFallbackCache.has(upperKey) || hfFallbackCache.has(lowerKey)) return true;

  const isLc = platformHint?.toLowerCase() === "leetcode" || platformHint?.toLowerCase() === "lc" || lowerKey.startsWith("lc-");
  if (isLc) {
    const slug = lowerKey.replace(/^lc-/, "");
    const lcData = await queryLeetCodeDataset(slug);
    if (lcData && lcData.tests.length > 0) {
      cacheHfTests(upperKey, lcData.tests);
      cacheHfTests(lowerKey, lcData.tests);
      return true;
    }
  }

  const res = await resolveHardtestsData(key, platformHint);
  if (res && res.tests.length > 0) {
    cacheHfTests(upperKey, res.tests);
    return true;
  }
  return false;
}

export async function hasStatement(key: string, platformHint?: string): Promise<boolean> {
  const rows = await db
    .select({ problemKey: problems.problemKey })
    .from(problems)
    .where(inArray(problems.problemKey, localKeyCandidates(key)))
    .limit(1);
  if (rows.length > 0) return true;

  const res = await resolveHardtestsData(key, platformHint);
  return !!res;
}

// ── Paginated problem list for the Problems tab ────────────────────────────────

export interface ListProblemsOptions {
  search?: string;
  tags?: string[];       // filter must-include all tags
  ratingMin?: number;
  ratingMax?: number;
  difficulty?: "easy" | "medium" | "hard"; // mapped to rating ranges
  platform?: string;
  page?: number;
  pageSize?: number;
}

/** Codeforces difficulty band mapping (roughly). */
const DIFFICULTY_RANGES: Record<string, { min: number; max: number }> = {
  easy:   { min: 800,  max: 1300 },
  medium: { min: 1301, max: 1900 },
  hard:   { min: 1901, max: 3500 },
};

export async function listProblems(opts: ListProblemsOptions = {}): Promise<ProblemListResult> {
  const pageSize = Math.min(opts.pageSize ?? 50, 100);
  const page = Math.max(opts.page ?? 1, 1);
  const offset = (page - 1) * pageSize;

  const isLc = opts.platform?.toLowerCase() === "leetcode" || opts.platform?.toLowerCase() === "lc";
  const isCf = opts.platform?.toLowerCase() === "codeforces" || opts.platform?.toLowerCase() === "cf";

  // Build where conditions
  const conditions = [
    sql`${problems.title} IS NOT NULL`,
  ];

  if (isLc) {
    conditions.push(sql`(${problems.problemKey} LIKE 'LC-%' OR ${problems.problemKey} LIKE 'lc-%')`);
  } else if (isCf) {
    conditions.push(sql`(${problems.problemKey} NOT LIKE 'LC-%' AND ${problems.problemKey} NOT LIKE 'lc-%')`);
  }

  if (opts.search) {
    conditions.push(ilike(problems.title, `%${opts.search}%`));
  }

  if (opts.difficulty && DIFFICULTY_RANGES[opts.difficulty]) {
    const { min, max } = DIFFICULTY_RANGES[opts.difficulty];
    conditions.push(gte(problems.rating, min));
    conditions.push(lte(problems.rating, max));
  } else {
    if (opts.ratingMin !== undefined) conditions.push(gte(problems.rating, opts.ratingMin));
    if (opts.ratingMax !== undefined) conditions.push(lte(problems.rating, opts.ratingMax));
  }

  // Tag filtering — check JSON array containment using PostgreSQL @> operator
  if (opts.tags && opts.tags.length > 0) {
    for (const tag of opts.tags) {
      conditions.push(sql`${problems.tags} @> ${JSON.stringify([tag])}::jsonb`);
    }
  }

  const where = conditions.length > 0 ? and(...conditions) : undefined;

  let rows: any[] = [];
  let total = 0;

  try {
    const targetDb = isLc ? dbLC : db;
    const [rRows, cRes] = await Promise.all([
      targetDb
        .select()
        .from(problems)
        .where(where)
        .orderBy(problems.rating)
        .limit(pageSize)
        .offset(offset),
      targetDb
        .select({ count: sql<number>`COUNT(*)::int` })
        .from(problems)
        .where(where),
    ]);
    rows = rRows;
    total = cRes[0]?.count ?? 0;
  } catch (err) {
    console.error("[problemDb] listProblems query error, falling back to primary db:", err);
    try {
      const [rRows, cRes] = await Promise.all([
        db
          .select()
          .from(problems)
          .where(where)
          .orderBy(problems.rating)
          .limit(pageSize)
          .offset(offset),
        db
          .select({ count: sql<number>`COUNT(*)::int` })
          .from(problems)
          .where(where),
      ]);
      rows = rRows;
      total = cRes[0]?.count ?? 0;
    } catch (e2) {
      console.error("[problemDb] secondary fallback error:", e2);
    }
  }

  const resultStatements = rows.map(toStatement);

  if (resultStatements.length === 0) {
    const fallbackList = isLc ? MOCK_LEETCODE_PROBLEMS : MOCK_CF_PROBLEMS;
    const filtered = fallbackList.filter((p) => {
      if (opts.search && !p.title?.toLowerCase().includes(opts.search.toLowerCase())) return false;
      return true;
    });
    return {
      problems: filtered,
      total: filtered.length,
      page: 1,
      pages: 1,
    };
  }

  return {
    problems: resultStatements,
    total,
    page,
    pages: Math.ceil(total / pageSize) || 1,
  };
}

const MOCK_CF_PROBLEMS: ProblemStatement[] = [
  { key: "4-A", contestId: 4, index: "A", title: "Watermelon", rating: 800, tags: ["brute force", "math"], timeLimitMs: 1000, memoryLimitMb: 256, description: "Pete and Billy bought a watermelon...", inputFormat: "8", outputFormat: "YES", note: null, examples: [{ input: "8", output: "YES" }], interactive: false, judgeable: true, testCount: 10, platform: "codeforces" },
  { key: "71-A", contestId: 71, index: "A", title: "Way Too Long Words", rating: 800, tags: ["strings"], timeLimitMs: 1000, memoryLimitMb: 256, description: "Abbreviate long words...", inputFormat: "4", outputFormat: "l10n", note: null, examples: [{ input: "localization", output: "l10n" }], interactive: false, judgeable: true, testCount: 10, platform: "codeforces" },
  { key: "231-A", contestId: 231, index: "A", title: "Team", rating: 800, tags: ["greedy"], timeLimitMs: 2000, memoryLimitMb: 256, description: "Friends solve problems together...", inputFormat: "3", outputFormat: "2", note: null, examples: [{ input: "1 1 0", output: "2" }], interactive: false, judgeable: true, testCount: 10, platform: "codeforces" },
  { key: "158-A", contestId: 158, index: "A", title: "Next Round", rating: 800, tags: ["implementation"], timeLimitMs: 3000, memoryLimitMb: 256, description: "Contestants advancing...", inputFormat: "8 5", outputFormat: "6", note: null, examples: [{ input: "8 5", output: "6" }], interactive: false, judgeable: true, testCount: 10, platform: "codeforces" },
  { key: "282-A", contestId: 282, index: "A", title: "Bit++", rating: 800, tags: ["implementation"], timeLimitMs: 1000, memoryLimitMb: 256, description: "Programming language Bit++...", inputFormat: "1", outputFormat: "1", note: null, examples: [{ input: "++X", output: "1" }], interactive: false, judgeable: true, testCount: 10, platform: "codeforces" },
];

const MOCK_LEETCODE_PROBLEMS: ProblemStatement[] = [
  { key: "LC-two-sum", contestId: 0, index: "two-sum", title: "Two Sum", rating: 800, tags: ["array", "hash-table"], timeLimitMs: 1000, memoryLimitMb: 256, description: "Find two numbers that add up to target.", inputFormat: "nums = [2,7,11,15], target = 9", outputFormat: "[0,1]", note: null, examples: [{ input: "[2,7,11,15]\n9", output: "[0,1]" }], interactive: false, judgeable: true, testCount: 10, platform: "leetcode" },
  { key: "LC-valid-parentheses", contestId: 0, index: "valid-parentheses", title: "Valid Parentheses", rating: 900, tags: ["string", "stack"], timeLimitMs: 1000, memoryLimitMb: 256, description: "Determine if parentheses are valid.", inputFormat: "s = \"()[]{}\"", outputFormat: "true", note: null, examples: [{ input: "\"()[]{}\"", output: "true" }], interactive: false, judgeable: true, testCount: 10, platform: "leetcode" },
  { key: "LC-best-time-to-buy-and-sell-stock", contestId: 0, index: "best-time-to-buy-and-sell-stock", title: "Best Time to Buy and Sell Stock", rating: 1000, tags: ["array", "dynamic-programming"], timeLimitMs: 1000, memoryLimitMb: 256, description: "Maximize profit from buying and selling stock.", inputFormat: "prices = [7,1,5,3,6,4]", outputFormat: "5", note: null, examples: [{ input: "[7,1,5,3,6,4]", output: "5" }], interactive: false, judgeable: true, testCount: 10, platform: "leetcode" },
];
