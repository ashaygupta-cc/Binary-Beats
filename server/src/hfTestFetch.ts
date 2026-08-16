/**
 * On-demand recovery of a single problem's official tests straight from the
 * open-r1/codeforces dataset on Hugging Face (via the datasets-server
 * /filter API), for problems whose `tests_complete` flag says the *source*
 * has a full suite but whose test rows never made it into Neon — the
 * free-tier DB is already at its 512 MB cap (see .env.example), so this
 * exists instead of a bigger bulk re-ingest. Callers cache the result
 * themselves (see problemDb.ts) rather than writing it back to Postgres.
 */

const FILTER_URL = "https://datasets-server.huggingface.co/filter";
const DATASET = "open-r1/codeforces";
// Problems live in either split; train is far larger so it's checked first.
const SPLITS = ["train", "test"] as const;
const MAX_ATTEMPTS = 3;
const RETRY_DELAY_MS = 1500;

interface HFRow {
  official_tests?: { input: string; output: string }[];
  official_tests_complete?: boolean;
}

interface FilterResponse {
  rows?: { row: HFRow }[];
  error?: string;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function escapeSqlString(v: string): string {
  return v.replace(/'/g, "''");
}

/** Queries one split for the exact (contestId, index) row. Retries a couple
 *  of times on the dataset-server's transient "index is loading" / generic
 *  error responses — those clear up within a few seconds. */
async function queryFilter(split: string, contestId: number, index: string): Promise<HFRow | undefined> {
  const where = `"contest_id"='${contestId}' AND "index"='${escapeSqlString(index)}'`;
  const url =
    `${FILTER_URL}?dataset=${encodeURIComponent(DATASET)}&config=default&split=${split}` +
    `&where=${encodeURIComponent(where)}&length=1`;

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      const res = await fetch(url);
      if (res.ok) {
        const body = (await res.json()) as FilterResponse;
        if (!body.error) return body.rows?.[0]?.row;
      }
    } catch {
      // network hiccup — fall through to retry
    }
    if (attempt < MAX_ATTEMPTS) await sleep(RETRY_DELAY_MS);
  }
  return undefined;
}

/**
 * Fetches the official tests for one problem directly from Hugging Face.
 * Returns undefined if the problem can't be found or the dataset itself
 * doesn't have a complete suite for it (nothing to recover in that case —
 * the local `tests_complete` flag already reflects that).
 */
export async function fetchOfficialTestsFromHF(
  contestId: number,
  index: string
): Promise<{ input: string; output: string }[] | undefined> {
  for (const split of SPLITS) {
    const row = await queryFilter(split, contestId, index);
    if (row?.official_tests_complete === true && Array.isArray(row.official_tests) && row.official_tests.length > 0) {
      return row.official_tests.map((t) => ({ input: String(t.input ?? ""), output: String(t.output ?? "") }));
    }
  }
  return undefined;
}
