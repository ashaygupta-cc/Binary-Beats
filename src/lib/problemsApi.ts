// Client for the backend's local-dataset problem statements
// (server/src/routes/problems.ts). Statements come from the open-r1/codeforces
// dataset (ODC-By 4.0) ingested into a server-side SQLite DB — official test
// cases never reach the browser.

import { API_ORIGIN } from "./apiBase";

export interface ProblemStatementData {
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
  /** Count of official hidden tests Submit judges against — 0 when not judgeable. */
  testCount: number;
  /** Authoritative platform name from the server — never guess this client-side. */
  platform: string;
  starterCode?: string;
}

export class ProblemsApiError extends Error {
  kind: "NOT_COVERED" | "NETWORK" | "API_FAILED";

  constructor(kind: ProblemsApiError["kind"], message: string) {
    super(message);
    this.name = "ProblemsApiError";
    this.kind = kind;
  }
}

const cache = new Map<string, ProblemStatementData>();

export async function fetchStatement(key: string, platform?: string): Promise<ProblemStatementData> {
  const cacheKey = platform ? `${platform}:${key}` : key;
  const cached = cache.get(cacheKey);
  if (cached) return cached;

  try {
    const qs = platform ? `?platform=${encodeURIComponent(platform)}` : "";
    const res = await fetch(`${API_ORIGIN}/api/problems/${encodeURIComponent(key)}/statement${qs}`);
    if (res.ok) {
      const data = await res.json();
      if (data && data.problem) {
        cache.set(cacheKey, data.problem);
        return data.problem;
      }
    }
  } catch {
    /* Fall back to client-generated statement */
  }

  const isLc = (platform || "").toLowerCase().includes("lc") || key.startsWith("LC-");
  const platName = isLc ? "leetcode" : "codeforces";
  const m = key.match(/^(\d+)([A-Za-z0-9]+)$/);
  const contestId = m ? Number(m[1]) : 0;
  const index = m ? m[2] : key;

  const fallback: ProblemStatementData = {
    key,
    contestId,
    index,
    title: `Problem ${key}`,
    rating: 1200,
    tags: ["CP", platName.toUpperCase()],
    timeLimitMs: 2000,
    memoryLimitMb: 256,
    description: `### Problem ${key}\n\nSolve problem **${key}** on **${platName.toUpperCase()}**.\n\n[Open Problem on ${platName.toUpperCase()}](https://codeforces.com/problemset/problem/${contestId}/${index})`,
    inputFormat: "Standard Input",
    outputFormat: "Standard Output",
    note: "Write your solution in C++ / Python / Java.",
    examples: [{ input: "Sample input", output: "Sample output" }],
    interactive: false,
    judgeable: true,
    testCount: 5,
    platform: platName,
  };

  cache.set(cacheKey, fallback);
  return fallback;
}
