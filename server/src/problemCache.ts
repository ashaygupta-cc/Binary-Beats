import { fetchProblemset } from "./codeforces.js";

export interface OptimizedProblem {
  contestId: number;
  index: string;
  name: string;
  rating: number;
  tags: string[];
}

const TTL_MS = 24 * 60 * 60 * 1000;

let cache: { fetchedAt: number; problems: OptimizedProblem[] } | null = null;
let inFlight: Promise<OptimizedProblem[]> | null = null;

/**
 * Fetches Codeforces' full ~9000-problem catalog, trims it to just what the
 * Blitz & Duel algorithm needs (drops points/type/etc., keeps tags since those
 * are shown as chips on each problem row), and caches the result in memory for
 * every client this server serves — one shared fetch instead of one per
 * browser tab.
 */
export async function getProblemset(): Promise<OptimizedProblem[]> {
  if (cache && Date.now() - cache.fetchedAt < TTL_MS) return cache.problems;
  if (inFlight) return inFlight;

  inFlight = (async () => {
    try {
      const raw = await fetchProblemset();
      const trimmed: OptimizedProblem[] = raw
        .filter(
          (p): p is typeof p & { rating: number } =>
            p.type === "PROGRAMMING" &&
            typeof p.rating === "number" &&
            // Interactive problems are a dead end here: no in-app judging is
            // possible and their samples aren't real transcripts.
            !p.tags.includes("interactive")
        )
        .map((p) => ({ contestId: p.contestId, index: p.index, name: p.name, rating: p.rating, tags: p.tags }));

      cache = { fetchedAt: Date.now(), problems: trimmed };
      return trimmed;
    } finally {
      inFlight = null;
    }
  })();

  return inFlight;
}
