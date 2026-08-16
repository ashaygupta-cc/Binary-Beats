import { randomUUID } from "node:crypto";

export type RunKind = "submit" | "samples" | "custom";
export type RunState = "queued" | "compiling" | "running" | "done";

export interface Verdict {
  status: "AC" | "WA" | "TLE" | "RE" | "CE";
  passedCount: number;
  totalCount: number;
  /** Slowest passing test's wall time. */
  timeMs: number;
  /** Peak resident memory across tests run so far, in MB. Undefined off Linux. */
  peakMemoryMb?: number;
  failedTestIndex?: number;
  /** True when the AC was recorded into the session. */
  solveRecorded?: boolean;
  /** The one test that failed — size-capped. Only ever this single test, never the rest of the suite. */
  failedTest?: { input: string; expected: string; actual: string };
}

export interface SampleResult {
  index: number;
  pass: boolean;
  input: string;
  expected: string;
  actual: string;
  timeMs: number;
  peakMemoryMb?: number;
  outcome: "ok" | "tle" | "re";
}

export interface CustomOutput {
  stdout: string;
  stderr: string;
  timeMs: number;
  peakMemoryMb?: number;
  exitCode: number | null;
  timedOut: boolean;
}

export interface JudgeRun {
  id: string;
  kind: RunKind;
  state: RunState;
  sessionId?: string;
  problemKey?: string;
  /** Which OJ problemKey belongs to — "codeforces" (default) | "leetcode" |
   *  "atcoder" | "codechef". Passed through to problemDb lookups so a
   *  non-Codeforces problem doesn't have to be guessed at from its key alone. */
  platform?: string;
  handle?: string;
  progress?: { done: number; total: number };
  compileError?: string;
  verdict?: Verdict;
  samples?: SampleResult[];
  output?: CustomOutput;
  createdAt: number;
}

const MAX_QUEUED = 4;
const FINISHED_TTL_MS = 10 * 60 * 1000;

const runs = new Map<string, JudgeRun>();

export class JudgeBusyError extends Error {
  constructor() {
    super("The judge is busy — try again in a moment.");
    this.name = "JudgeBusyError";
  }
}

export function createRun(fields: Pick<JudgeRun, "kind" | "sessionId" | "problemKey" | "handle" | "platform">): JudgeRun {
  const queued = [...runs.values()].filter((r) => r.state !== "done").length;
  if (queued >= MAX_QUEUED) throw new JudgeBusyError();

  const run: JudgeRun = {
    id: randomUUID(),
    state: "queued",
    createdAt: Date.now(),
    ...fields,
  };
  runs.set(run.id, run);
  return run;
}

export function getRun(id: string): JudgeRun | undefined {
  return runs.get(id);
}

export function updateRun(id: string, patch: Partial<JudgeRun>): JudgeRun | undefined {
  const run = runs.get(id);
  if (!run) return undefined;
  const updated = { ...run, ...patch };
  runs.set(id, updated);
  return updated;
}

export function sweepFinishedRuns(): void {
  const cutoff = Date.now() - FINISHED_TTL_MS;
  for (const [id, run] of runs) {
    if (run.state === "done" && run.createdAt < cutoff) runs.delete(id);
  }
}

// --- single-flight execution queue -----------------------------------------
// One compile/run at a time keeps timing honest (parallel runs would contend
// for CPU and produce bogus TLEs).

let executing = false;
const pending: (() => Promise<void>)[] = [];

export function enqueueExecution(task: () => Promise<void>): void {
  pending.push(task);
  void drain();
}

async function drain(): Promise<void> {
  if (executing) return;
  executing = true;
  try {
    while (pending.length > 0) {
      const task = pending.shift()!;
      try {
        await task();
      } catch (e) {
        console.error("[judge] task failed:", e instanceof Error ? e.message : e);
      }
    }
  } finally {
    executing = false;
  }
}
