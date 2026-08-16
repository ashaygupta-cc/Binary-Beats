import { problemKey } from "./codeforces.js";
import type { OptimizedProblem } from "./problemCache.js";

export const RATING_MIN = 800;
export const RATING_MAX = 3500;
export const RATING_STEP = 100;

export class NoProblemsError extends Error {
  target: number;

  constructor(target: number) {
    super(`No unsolved problems found near rating ${target}.`);
    this.name = "NoProblemsError";
    this.target = target;
  }
}

function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n));
}

/** Snaps a raw rating to Codeforces' real 100-point scale, clamped to [800, 3500]. */
export function snapRating(raw: number): number {
  const snapped = Math.round(raw / RATING_STEP) * RATING_STEP;
  return clamp(snapped, RATING_MIN, RATING_MAX);
}

/** A player's rating for algorithm purposes — unrated players default to the 800 baseline. */
export function effectiveRating(user: { rating?: number | null }): number {
  return snapRating(user.rating ?? RATING_MIN);
}

/** Ensures a strictly increasing sequence, bumping duplicates upward (capped at RATING_MAX). */
function dedupeBump(targets: number[]): number[] {
  const result: number[] = [];
  for (const t of targets) {
    const prev = result[result.length - 1];
    result.push(prev !== undefined && t <= prev ? Math.min(prev + RATING_STEP, RATING_MAX) : t);
  }
  return result;
}

/** Solo Blitz: a 4-problem staircase around the player's own rating. */
export function buildSoloTargets(rating: number): number[] {
  const eff = snapRating(rating);
  const offsets = [-200, -100, 0, 100];
  return dedupeBump(offsets.map((o) => snapRating(eff + o)));
}

/**
 * Duel: a 5-problem set anchored 60/40 toward the LOWER-rated player, with the
 * higher-rated player's pull capped at +200.
 */
export function buildDuelTargets(ratingA: number, ratingB: number): number[] {
  const lo = Math.min(effectiveRating({ rating: ratingA }), effectiveRating({ rating: ratingB }));
  const hi = Math.max(effectiveRating({ rating: ratingA }), effectiveRating({ rating: ratingB }));
  const gap = hi - lo;
  const anchor = snapRating(lo + 0.4 * Math.min(gap, 500));
  const offsets = [-200, -100, 0, 100, 200];
  return dedupeBump(offsets.map((o) => snapRating(anchor + o)));
}

export interface SessionProblem {
  contestId: number;
  index: string;
  name: string;
  rating: number;
  tags: string[];
  /** Statement + examples available from the local dataset DB. */
  covered?: boolean;
  /** Complete official test suite available — in-app Submit works. */
  judgeable?: boolean;
  platform?: string;
  url?: string;
}

const WIDEN_STEPS = [0, 100, 200, 300, 400];

/**
 * Picks one unsolved problem per target rating from the catalog, widening the
 * search window around a target if nothing matches exactly.
 *
 * When `preferredKeys` is given (problems with a complete local test suite),
 * the whole widening search runs against preferred problems first, and only
 * falls back to the full catalog when no preferred problem exists anywhere
 * near the target — a strong preference that can never make selection fail.
 */
export function selectProblems(
  catalog: OptimizedProblem[],
  targets: number[],
  solvedKeys: Set<string>,
  preferredKeys?: Set<string>
): SessionProblem[] {
  const picked: SessionProblem[] = [];
  const pickedKeys = new Set<string>();

  const search = (target: number, pool: OptimizedProblem[]): OptimizedProblem[] => {
    for (const widen of WIDEN_STEPS) {
      const inWindow = pool.filter((p) => {
        const key = problemKey(p);
        return Math.abs(p.rating - target) <= widen && !solvedKeys.has(key) && !pickedKeys.has(key);
      });
      if (inWindow.length > 0) return inWindow;
    }
    return [];
  };

  const preferredPool =
    preferredKeys && preferredKeys.size > 0 ? catalog.filter((p) => preferredKeys.has(problemKey(p))) : [];

  for (const target of targets) {
    let candidates = preferredPool.length > 0 ? search(target, preferredPool) : [];
    if (candidates.length === 0) candidates = search(target, catalog);

    if (candidates.length === 0) {
      throw new NoProblemsError(target);
    }

    const chosen = candidates[Math.floor(Math.random() * candidates.length)];
    picked.push({
      contestId: chosen.contestId,
      index: chosen.index,
      name: chosen.name,
      rating: chosen.rating,
      tags: chosen.tags,
    });
    pickedKeys.add(problemKey(chosen));
  }

  return picked;
}
