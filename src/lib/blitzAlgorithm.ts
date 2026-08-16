// Rating-band math shared with the backend (server/src/blitzAlgorithm.ts) —
// kept here too so SessionSetup can preview the target draw before the user
// commits. Actual problem *selection* now happens server-side, at session
// creation, using its own copy of this same math against the live catalog.

export const RATING_MIN = 800;
export const RATING_MAX = 3500;
export const RATING_STEP = 100;

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
