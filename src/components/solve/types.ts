import type { PollState } from "../../hooks/useSessionPolling";

/** Minimal problem shape the solve workspace needs — both Blitz's SessionProblem
 *  and practice mode's Problem (useProblems.ts) adapt down to this via adapters.ts. */
export interface SolvableProblem {
  key: string;
  contestId: number;
  index: string;
  title: string;
  rating: number | null;
  difficulty?: string;
  tags: string[];
  judgeable: boolean;
  platform?: string;
}

export function getProblemExternalUrl(p: SolvableProblem & { url?: string }): string {
  if (p.url) return p.url;

  const platform = (p.platform ?? "").toLowerCase();
  const id = p.key;

  if (platform === "leetcode" || platform === "lc") {
    const slug = id.replace(/^LC-/, "");
    return `https://leetcode.com/problems/${slug}/`;
  }
  if (platform === "atcoder" || platform === "ac") {
    const parts = id.split("_");
    const contest = parts[0] ? parts[0].toLowerCase() : id.toLowerCase();
    return `https://atcoder.jp/contests/${contest}/tasks/${id}`;
  }
  if (platform === "codechef" || platform === "cc") {
    return `https://www.codechef.com/problems/${id}`;
  }

  // Default: Codeforces (cf / codeforces)
  const contestId = p.contestId;
  const index = p.index;
  if (contestId && index) {
    return `https://codeforces.com/problemset/problem/${contestId}/${index}`;
  }
  const m = id.match(/^(\d+)-([A-Za-z]\d?)$/i) || id.match(/^(\d+)([A-Za-z]\d?)$/i);
  if (m) {
    return `https://codeforces.com/problemset/problem/${m[1]}/${m[2]}`;
  }
  return `https://codeforces.com/problemset`;
}

export interface SolveSidebarProblem {
  key: string;
  letter: string;
  title: string;
  rating: number | null;
  solved: boolean;
  solvedByMe: boolean;
}

export type SolveClaim = { label: string; mine: boolean } | null;

export type SolveWorkspaceProps =
  | {
      mode: "session";
      problem: SolvableProblem;
      orderIndex: number;
      sidebarItems: SolveSidebarProblem[];
      progress: { solved: number; total: number };
      claim: SolveClaim;
      pollState: PollState;
      sessionId: string;
      onBack: () => void;
      onSelectProblem: (index: number) => void;
      onAccepted: () => void;
      playSound: (type: "click" | "hover") => void;
      onSyncPoints?: () => Promise<{ success: boolean; results: string[]; earned: number }>;
      onForfeitMatch?: () => void;
    }
  | {
      mode: "practice";
      problem: SolvableProblem;
      solved: boolean;
      onBack: () => void;
      onAccepted: () => void;
      playSound: (type: "click" | "hover") => void;
      onSyncPoints?: () => Promise<{ success: boolean; results: string[]; earned: number }>;
      onForfeitMatch?: () => void;
    };
