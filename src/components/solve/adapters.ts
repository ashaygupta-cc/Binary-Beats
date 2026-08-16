import type { Problem } from "../../hooks/useProblems";
import { problemKey } from "../../lib/codeforces";
import { claimedBy, isDuelMode, type BlitzSession, type SessionProblem } from "../../lib/blitzSession";
import type { SolvableProblem, SolveClaim, SolveSidebarProblem } from "./types";

const LETTERS = "ABCDEFGH";

export function sessionProblemToSolvable(p: SessionProblem): SolvableProblem & { url?: string } {
  return {
    key: problemKey(p),
    contestId: p.contestId,
    index: p.index,
    title: p.name,
    rating: p.rating,
    tags: p.tags,
    judgeable: p.judgeable === true,
    platform: p.platform || (p.contestId > 0 ? "codeforces" : "leetcode"),
    url: p.url,
  };
}

export function practiceProblemToSolvable(p: Problem): SolvableProblem {
  const platStr = (p.platform || "").toLowerCase();
  const isLc =
    platStr.includes("lc") ||
    platStr.includes("leetcode") ||
    p.key.toLowerCase().startsWith("lc-") ||
    (!p.contestId && p.key.includes("-"));

  return {
    key: p.key,
    contestId: p.contestId,
    index: p.index,
    title: p.title ?? p.key,
    rating: p.rating,
    tags: p.tags,
    judgeable: p.judgeable,
    platform: isLc ? "leetcode" : "codeforces",
  };
}

/** Who (if anyone) has claimed/solved a given problem in this session. */
function winnerOf(session: BlitzSession, key: string): string | null {
  const me = session.handles[0];
  return isDuelMode(session.mode) ? claimedBy(session, key) : session.results[me]?.[key] !== undefined ? me : null;
}

export function deriveSidebarItems(session: BlitzSession): SolveSidebarProblem[] {
  const me = session.handles[0];
  return session.problems.map((p, i) => {
    const key = problemKey(p);
    const winner = winnerOf(session, key);
    return {
      key,
      letter: LETTERS[i] ?? String(i + 1),
      title: p.name,
      rating: p.rating,
      solved: winner !== null,
      solvedByMe: winner === me,
    };
  });
}

export function deriveProgress(session: BlitzSession): { solved: number; total: number } {
  const solved = session.problems.filter((p) => winnerOf(session, problemKey(p)) !== null).length;
  return { solved, total: session.problems.length };
}

import type { DailyProblem } from "../../lib/botApi";

export function deriveClaim(session: BlitzSession, key: string): SolveClaim {
  const me = session.handles[0];
  const winner = winnerOf(session, key);
  if (winner === null) return null;
  return {
    mine: winner === me,
    label: isDuelMode(session.mode) ? (session.displayHandles[winner] ?? winner) : "Solved",
  };
}

export function dailyProblemToSolvable(p: DailyProblem): SolvableProblem {
  let contestId = 0;
  let index = "";
  if (p.platform.toLowerCase() === "codeforces") {
    const m = p.problem_id.match(/^(\d+)([A-Za-z]\d?)$/);
    if (m) {
      contestId = parseInt(m[1]);
      index = m[2];
    }
  }
  return {
    key: p.problem_id,
    contestId,
    index,
    title: p.title ?? p.problem_id,
    rating: p.difficulty ? parseInt(p.difficulty) || null : null,
    tags: [],
    judgeable: true,
    platform: p.platform.toLowerCase(),
  };
}
