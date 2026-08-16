// Client for OUR OWN backend (server/, a small Koa API), which in turn talks to
// the public Codeforces API. The backend centralizes rate-limiting, caching,
// and payload trimming so every browser tab isn't independently hammering
// Codeforces or re-fetching the ~9000-problem catalog.

import { API_ORIGIN } from "./apiBase";

export interface CfUser {
  handle: string;
  rating: number | null;
  maxRating: number | null;
  rank: string | null;
}

export interface CfSubmission {
  id: number;
  creationTimeSeconds: number;
  verdict: string | null;
  problem: { contestId: number; index: string };
}

export interface CfRatingChange {
  contestId: number;
  contestName: string;
  newRating: number;
  oldRating: number;
  ratingUpdateTimeSeconds: number;
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

const API_BASE = `${API_ORIGIN}/api/cf`;

function classifyStatus(status: number): CfErrorKind {
  if (status === 404) return "NOT_FOUND";
  if (status === 429) return "RATE_LIMITED";
  return "API_FAILED";
}

async function apiGet<T>(path: string): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${API_BASE}${path}`);
  } catch {
    throw new CfApiError("NETWORK", "Could not reach the Binary Beats API.");
  }

  let body: { error?: string; message?: string } & Partial<T>;
  try {
    body = await res.json();
  } catch {
    throw new CfApiError("NETWORK", "The Binary Beats API returned an unreadable response.");
  }

  if (!res.ok) {
    throw new CfApiError(classifyStatus(res.status), body.message || "Request failed.");
  }

  return body as T;
}

export function isValidHandleFormat(handle: string): boolean {
  return /^[A-Za-z0-9_.-]{2,24}$/.test(handle.trim());
}

export async function fetchUserInfo(handles: string[]): Promise<CfUser[]> {
  try {
    const { users } = await apiGet<{ users: CfUser[] }>(`/user/${handles.map(encodeURIComponent).join(";")}`);
    if (users && Array.isArray(users)) return users;
  } catch {
    /* Fall back to direct Codeforces public API */
  }

  try {
    const cfUrl = `https://codeforces.com/api/user.info?handles=${handles.map(encodeURIComponent).join(";")}`;
    const res = await fetch(cfUrl);
    if (!res.ok) {
      if (res.status === 404) throw new CfApiError("NOT_FOUND", "Codeforces user not found");
      throw new CfApiError("API_FAILED", "Codeforces API error");
    }
    const data = await res.json();
    if (data.status === "OK" && Array.isArray(data.result)) {
      return data.result.map((u: any) => ({
        handle: u.handle,
        rating: u.rating ?? null,
        maxRating: u.maxRating ?? null,
        rank: u.rank ?? null,
      }));
    }
    throw new CfApiError("NOT_FOUND", "Codeforces user not found");
  } catch (err) {
    if (err instanceof CfApiError) throw err;
    throw new CfApiError("NETWORK", "Could not reach Codeforces.");
  }
}

export async function fetchUserStatus(handle: string, count?: number): Promise<CfSubmission[]> {
  try {
    const qs = count ? `?count=${count}` : "";
    const { submissions } = await apiGet<{ submissions: CfSubmission[] }>(`/status/${encodeURIComponent(handle)}${qs}`);
    if (submissions && Array.isArray(submissions)) return submissions;
  } catch {
    /* Fall back to direct Codeforces public API */
  }

  try {
    const limit = count ?? 50;
    const cfUrl = `https://codeforces.com/api/user.status?handle=${encodeURIComponent(handle)}&from=1&count=${limit}`;
    const res = await fetch(cfUrl);
    if (!res.ok) return [];
    const data = await res.json();
    if (data.status === "OK" && Array.isArray(data.result)) {
      return data.result.map((s: any) => ({
        id: s.id,
        creationTimeSeconds: s.creationTimeSeconds,
        verdict: s.verdict ?? null,
        problem: { contestId: s.problem?.contestId ?? 0, index: s.problem?.index ?? "" },
      }));
    }
    return [];
  } catch {
    return [];
  }
}

export async function fetchRatingHistory(handle: string): Promise<CfRatingChange[]> {
  try {
    const { history } = await apiGet<{ history: CfRatingChange[] }>(
      `/user/${encodeURIComponent(handle)}/rating-history`
    );
    if (history && Array.isArray(history)) return history;
  } catch {
    /* Fall back to direct Codeforces public API */
  }

  try {
    const cfUrl = `https://codeforces.com/api/user.rating?handle=${encodeURIComponent(handle)}`;
    const res = await fetch(cfUrl);
    if (!res.ok) return [];
    const data = await res.json();
    if (data.status === "OK" && Array.isArray(data.result)) {
      return data.result.map((r: any) => ({
        contestId: r.contestId,
        contestName: r.contestName,
        newRating: r.newRating,
        oldRating: r.oldRating,
        ratingUpdateTimeSeconds: r.ratingUpdateTimeSeconds,
      }));
    }
    return [];
  } catch {
    return [];
  }
}

export function problemKey(p: { contestId: number; index: string }): string {
  if (p.contestId && p.contestId > 0) {
    return `${p.contestId}-${p.index}`;
  }
  return p.index;
}

export function problemUrl(p: { contestId: number; index: string }): string {
  return `https://codeforces.com/problemset/problem/${p.contestId}/${p.index}`;
}
