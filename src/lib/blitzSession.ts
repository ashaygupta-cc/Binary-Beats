import { problemKey } from "./codeforces";

export type BlitzMode = "cp_blitz" | "dsa_blitz" | "icpc_blitz" | "cp_duel" | "dsa_duel" | "icpc_duel" | "blitz" | "duel";

export interface SessionProblem {
  contestId: number;
  index: string;
  name: string;
  rating: number;
  tags: string[];
  /** Statement + examples available from the server's local dataset DB. */
  covered?: boolean;
  /** Complete official test suite available server-side — in-app Submit works. */
  judgeable?: boolean;
  platform?: string;
  url?: string;
}

/** Mirrors server/src/blitzSession.ts's BlitzSession — the server is the sole
 *  authority that creates/mutates these; the frontend only ever reads them
 *  back from the API and renders them. */
export interface BlitzSession {
  id: string;
  mode: BlitzMode;
  createdAtSeconds: number;
  /** Lowercased handles: [me] for solo, [me, rival] for duel. Used as the canonical key everywhere. */
  handles: string[];
  /** Lowercased handle -> the canonically-cased handle, for display only. */
  displayHandles: Record<string, string>;
  ratings: Record<string, number | null>;
  baselineSubmissionId: Record<string, number>;
  problems: SessionProblem[];
  /** handle -> problemKey -> accepted-at (epoch seconds) */
  results: Record<string, Record<string, number>>;
  /** handle -> problemKey -> where the accepted verdict came from. */
  solveSources?: Record<string, Record<string, "codeforces" | "local">>;
  status: "active" | "finished";
  finishedAtSeconds?: number;
}

export function isDuelMode(mode: BlitzMode | string): boolean {
  return mode.endsWith("_duel") || mode === "duel";
}

export function isBlitzMode(mode: BlitzMode | string): boolean {
  return mode.endsWith("_blitz") || mode === "blitz";
}

/** For duel mode: whichever handle has the earliest accepted-at time claims the problem. */
export function claimedBy(session: BlitzSession, key: string): string | null {
  let winner: string | null = null;
  let winnerTime = Infinity;
  for (const handle of session.handles) {
    const t = session.results[handle]?.[key];
    if (t !== undefined && t < winnerTime) {
      winner = handle;
      winnerTime = t;
    }
  }
  return winner;
}

/** Count of problems claimed/solved per handle. */
export function scores(session: BlitzSession): Record<string, number> {
  const out: Record<string, number> = Object.fromEntries(session.handles.map((h) => [h, 0]));
  const isDuel = isDuelMode(session.mode);
  for (const p of session.problems) {
    const key = problemKey(p);
    if (isDuel) {
      const winner = claimedBy(session, key);
      if (winner && out[winner] !== undefined) out[winner] += 1;
    } else {
      for (const handle of session.handles) {
        if (session.results[handle]?.[key] !== undefined && out[handle] !== undefined) out[handle] += 1;
      }
    }
  }
  return out;
}
