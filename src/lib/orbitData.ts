// Data source for the Orbit view (src/components/ProblemOrbit.tsx) — a
// circular roadmap of the problem set. Rather than one big fetch, we sweep
// the existing /api/problems endpoint across fixed rating bands in parallel
// so the sample spans the whole 800–3500 difficulty range instead of just
// the lowest-rated page. Each band query is index-backed (~1ms server-side)
// and the result is cached in-memory for the life of the tab.
import type { Problem } from "../hooks/useProblems";
import { API_ORIGIN } from "./apiBase";

export interface OrbitRing {
  min: number;
  max: number;
  label: string;
}

// Six difficulty bands double as the visualization's concentric rings —
// a literal circular progression from "Foundations" at the center out to
// "Grandmaster" at the rim.
export const ORBIT_RINGS: OrbitRing[] = [
  { min: 800, max: 1200, label: "Foundations" },
  { min: 1200, max: 1600, label: "Growth" },
  { min: 1600, max: 2000, label: "Proficient" },
  { min: 2000, max: 2400, label: "Expert" },
  { min: 2400, max: 2800, label: "Master" },
  { min: 2800, max: 3500, label: "Grandmaster" },
];

const PER_BAND = 80;

let cache: Problem[] | null = null;
let inflight: Promise<Problem[]> | null = null;

async function fetchBand(min: number, max: number): Promise<Problem[]> {
  const params = new URLSearchParams({
    ratingMin: String(min),
    ratingMax: String(max),
    page: "1",
    pageSize: String(PER_BAND),
  });
  try {
    const res = await fetch(`${API_ORIGIN}/api/problems?${params}`);
    if (!res.ok) return [];
    const data = (await res.json()) as { problems: Problem[] };
    return data.problems;
  } catch {
    return [];
  }
}

/** Fetches (and caches) a representative spread of problems across the full rating range. */
export function fetchOrbitProblems(): Promise<Problem[]> {
  if (cache) return Promise.resolve(cache);
  if (inflight) return inflight;

  inflight = Promise.all(ORBIT_RINGS.map((r) => fetchBand(r.min, r.max)))
    .then((bands) => {
      const seen = new Set<string>();
      const all: Problem[] = [];
      for (const band of bands) {
        for (const p of band) {
          if (seen.has(p.key)) continue;
          seen.add(p.key);
          all.push(p);
        }
      }
      all.sort((a, b) => (a.rating ?? 0) - (b.rating ?? 0));
      cache = all;
      return all;
    })
    .finally(() => {
      inflight = null;
    });

  return inflight;
}
