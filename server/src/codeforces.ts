// Server-side client for the public Codeforces API (https://codeforces.com/apiHelp).
// Centralizing this here means every browser tab/user shares one polite,
// rate-limited caller instead of each client hammering Codeforces independently.

export interface CfUser {
  handle: string;
  rating?: number;
  maxRating?: number;
  rank?: string;
}

export interface CfProblem {
  contestId: number;
  index: string;
  name: string;
  rating?: number;
  type: string;
  tags: string[];
}

export interface CfSubmission {
  id: number;
  creationTimeSeconds: number;
  problem: { contestId: number; index: string };
  verdict?: string;
}

export interface CfRatingChange {
  contestId: number;
  contestName: string;
  rank: number;
  ratingUpdateTimeSeconds: number;
  oldRating: number;
  newRating: number;
}

export type CfErrorKind = "NOT_FOUND" | "RATE_LIMITED" | "API_FAILED" | "NETWORK";

export class CfApiError extends Error {
  kind: CfErrorKind;

  constructor(kind: CfErrorKind, message: string) {
    super(message);
    this.name = "CfApiError";
    this.kind = kind;
  }
}

const API_BASE = "https://codeforces.com/api";
const MIN_REQUEST_GAP_MS = 2000;

// Module-level politeness throttle: every outbound Codeforces call — from any
// request our server is handling — is spaced out through this single queue.
let requestQueue: Promise<void> = Promise.resolve();
let lastDispatchAt = 0;

function throttledSlot(): Promise<void> {
  const slot = requestQueue.then(async () => {
    const wait = Math.max(0, lastDispatchAt + MIN_REQUEST_GAP_MS - Date.now());
    if (wait > 0) await new Promise((r) => setTimeout(r, wait));
    lastDispatchAt = Date.now();
  });
  requestQueue = slot;
  return slot;
}

function classifyFailure(comment: string | undefined): CfErrorKind {
  const c = (comment || "").toLowerCase();
  if (c.includes("not found")) return "NOT_FOUND";
  if (c.includes("limit")) return "RATE_LIMITED";
  return "API_FAILED";
}

async function cfGet<T>(method: string, params: Record<string, string>): Promise<T> {
  await throttledSlot();

  const query = new URLSearchParams(params).toString();
  const url = `${API_BASE}/${method}${query ? `?${query}` : ""}`;

  let res: Response;
  try {
    res = await fetch(url);
  } catch {
    throw new CfApiError("NETWORK", "Could not reach Codeforces.");
  }

  let body: { status: string; result?: T; comment?: string };
  try {
    body = (await res.json()) as typeof body;
  } catch {
    throw new CfApiError("NETWORK", "Codeforces returned an unreadable response.");
  }

  if (body.status !== "OK") {
    throw new CfApiError(classifyFailure(body.comment), body.comment || "Codeforces API request failed.");
  }

  return body.result as T;
}

export function fetchUserInfo(handles: string[]): Promise<CfUser[]> {
  return cfGet<CfUser[]>("user.info", { handles: handles.join(";") });
}

export async function fetchProblemset(): Promise<CfProblem[]> {
  const result = await cfGet<{ problems: CfProblem[] }>("problemset.problems", {});
  return result.problems;
}

export function fetchUserStatus(handle: string, count?: number): Promise<CfSubmission[]> {
  const params: Record<string, string> = { handle, from: "1" };
  if (count) params.count = String(count);
  return cfGet<CfSubmission[]>("user.status", params);
}

export function fetchUserRating(handle: string): Promise<CfRatingChange[]> {
  return cfGet<CfRatingChange[]>("user.rating", { handle });
}

export function problemKey(p: { contestId: number; index: string }): string {
  return `${p.contestId}-${p.index}`;
}
