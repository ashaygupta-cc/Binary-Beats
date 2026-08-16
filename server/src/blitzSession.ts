import { randomUUID } from "node:crypto";
import { problemKey } from "./codeforces.js";
import type { SessionProblem } from "./blitzAlgorithm.js";

export type BlitzMode = "blitz" | "duel";

export type SolveSource = "codeforces" | "local";

export interface BlitzSession {
  id: string;
  mode: BlitzMode;
  createdAtSeconds: number;
  /** Lowercased handles: [me] for solo, [me, rival] for duel. Used as the canonical key everywhere. */
  handles: string[];
  /** Lowercased handle -> the canonically-cased handle, for display only. */
  displayHandles: Record<string, string>;
  ratings: Record<string, number | null>;
  /** Newest submission id seen per handle at session creation — only submissions with a
   *  higher id than this count as a "solve" for this session. */
  baselineSubmissionId: Record<string, number>;
  problems: SessionProblem[];
  /** handle -> problemKey -> accepted-at (epoch seconds) */
  results: Record<string, Record<string, number>>;
  /** handle -> problemKey -> where the accepted verdict came from. */
  solveSources?: Record<string, Record<string, SolveSource>>;
  status: "active" | "finished";
  finishedAtSeconds?: number;
}

export function createSession(
  mode: BlitzMode,
  handles: string[],
  ratings: Record<string, number | null>,
  baselineSubmissionId: Record<string, number>,
  problems: SessionProblem[]
): BlitzSession {
  const lowerHandles = handles.map((h) => h.toLowerCase());
  return {
    id: randomUUID(),
    mode,
    createdAtSeconds: Math.floor(Date.now() / 1000),
    handles: lowerHandles,
    displayHandles: Object.fromEntries(handles.map((h) => [h.toLowerCase(), h])),
    ratings,
    baselineSubmissionId,
    problems,
    results: Object.fromEntries(lowerHandles.map((h) => [h, {}])),
    status: "active",
  };
}

export function recordSolve(
  session: BlitzSession,
  handle: string,
  key: string,
  acTimeSeconds: number,
  source: SolveSource = "codeforces"
): BlitzSession {
  const h = handle.toLowerCase();
  const existing = session.results[h]?.[key];
  if (existing !== undefined && existing <= acTimeSeconds) return session;

  return {
    ...session,
    results: {
      ...session.results,
      [h]: { ...session.results[h], [key]: acTimeSeconds },
    },
    solveSources: {
      ...session.solveSources,
      [h]: { ...session.solveSources?.[h], [key]: source },
    },
  };
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

export function isComplete(session: BlitzSession): boolean {
  if (session.mode === "duel") {
    return session.problems.every((p) => claimedBy(session, problemKey(p)) !== null);
  }
  const me = session.handles[0];
  return session.problems.every((p) => session.results[me]?.[problemKey(p)] !== undefined);
}

export function finishSession(session: BlitzSession): BlitzSession {
  if (session.status === "finished") return session;
  return { ...session, status: "finished", finishedAtSeconds: Math.floor(Date.now() / 1000) };
}
