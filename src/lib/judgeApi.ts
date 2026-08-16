// Client for the backend's local judge (server/src/routes/judge.ts): compiles
// and runs C++ on the user's own machine, judging against the dataset's
// official test suites. Mirrors blitzApi.ts's error-class pattern.

import { API_ORIGIN } from "./apiBase";

export type RunKind = "submit" | "samples" | "custom";
export type RunState = "queued" | "compiling" | "running" | "done";

export interface Verdict {
  status: "AC" | "WA" | "TLE" | "RE" | "CE";
  passedCount: number;
  totalCount: number;
  timeMs: number;
  peakMemoryMb?: number;
  failedTestIndex?: number;
  solveRecorded?: boolean;
  /** The one failing test — size-capped, never the rest of the suite. */
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
  progress?: { done: number; total: number };
  compileError?: string;
  verdict?: Verdict;
  samples?: SampleResult[];
  output?: CustomOutput;
}

export type JudgeApiErrorKind =
  | "BAD_REQUEST"
  | "NOT_FOUND"
  | "NOT_JUDGEABLE"
  | "SESSION_FINISHED"
  | "JUDGE_BUSY"
  | "API_FAILED"
  | "NETWORK";

export class JudgeApiError extends Error {
  kind: JudgeApiErrorKind;

  constructor(kind: JudgeApiErrorKind, message: string) {
    super(message);
    this.name = "JudgeApiError";
    this.kind = kind;
  }
}

const API_BASE = `${API_ORIGIN}/api/judge`;
const POLL_INTERVAL_MS = 800;

function classify(status: number, errorCode?: string): JudgeApiErrorKind {
  if (errorCode === "NOT_JUDGEABLE") return "NOT_JUDGEABLE";
  if (errorCode === "SESSION_FINISHED") return "SESSION_FINISHED";
  if (errorCode === "JUDGE_BUSY") return "JUDGE_BUSY";
  if (status === 404) return "NOT_FOUND";
  if (status === 400) return "BAD_REQUEST";
  return "API_FAILED";
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${API_BASE}${path}`, init);
  } catch {
    throw new JudgeApiError("NETWORK", "Could not reach the Binary Beats API.");
  }

  let body: { error?: string; message?: string } & Partial<T> = {};
  try {
    body = await res.json();
  } catch {
    // no body
  }

  if (!res.ok) {
    throw new JudgeApiError(classify(res.status, body.error), body.message || "Judge request failed.");
  }
  return body as T;
}

export interface CreateRunParams {
  kind: RunKind;
  code: string;
  problemKey?: string;
  sessionId?: string;
  stdin?: string;
  platform?: string;
}

export async function createRun(params: CreateRunParams): Promise<string> {
  const { runId } = await request<{ runId: string }>("/runs", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(params),
  });
  return runId;
}

export async function getRun(runId: string): Promise<JudgeRun> {
  const { run } = await request<{ run: JudgeRun }>(`/runs/${runId}`);
  return run;
}

/** Polls a run until it finishes; `onUpdate` fires on every state/progress change. */
export async function pollRun(runId: string, onUpdate?: (run: JudgeRun) => void): Promise<JudgeRun> {
  for (;;) {
    const run = await getRun(runId);
    onUpdate?.(run);
    if (run.state === "done") return run;
    await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));
  }
}
