// Client for our backend's session-authoritative Blitz & Duel endpoints
// (server/src/routes/blitz.ts). The server draws the problem set, tracks
// solves, and keeps polling Codeforces even while no browser tab is open —
// the frontend just creates a session, reads it back, and renders it.

import type { BlitzMode, BlitzSession } from "./blitzSession";
import { API_ORIGIN } from "./apiBase";

export type BlitzApiErrorKind = "NOT_FOUND" | "RATE_LIMITED" | "BAD_REQUEST" | "NO_PROBLEMS" | "API_FAILED" | "NETWORK";

export class BlitzApiError extends Error {
  kind: BlitzApiErrorKind;

  constructor(kind: BlitzApiErrorKind, message: string) {
    super(message);
    this.name = "BlitzApiError";
    this.kind = kind;
  }
}

const API_BASE = `${API_ORIGIN}/api/blitz`;

/** localStorage key holding the currently-active session's id (not the session
 *  itself — that lives server-side now). Shared between BlitzDuelView (owns
 *  it) and useCfHandle (clears it on unlink, since a session tied to a handle
 *  you've since unlinked shouldn't keep showing up). */
export const SESSION_ID_KEY = "bb_blitz_session_id";

function classify(status: number, errorCode?: string): BlitzApiErrorKind {
  if (errorCode === "NO_PROBLEMS") return "NO_PROBLEMS";
  if (status === 404) return "NOT_FOUND";
  if (status === 429) return "RATE_LIMITED";
  if (status === 400) return "BAD_REQUEST";
  return "API_FAILED";
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${API_BASE}${path}`, init);
  } catch {
    throw new BlitzApiError("NETWORK", "Could not reach the Binary Beats API.");
  }

  let body: { error?: string; message?: string } & Partial<T> = {};
  try {
    body = await res.json();
  } catch {
    // e.g. a 204 No Content response has no body
  }

  if (!res.ok) {
    throw new BlitzApiError(classify(res.status, body.error), body.message || "Request failed.");
  }

  return body as T;
}

function transformDuelPayload(data: any): BlitzSession {
  const duel = data.duel || data;
  const problems = (data.problems || data.all_problems || []).map((p: any) => ({
    contestId: p.platform === "cf" ? parseInt(p.problem_id) || 0 : 0,
    index: p.problem_id,
    name: p.title,
    rating: p.rating || 0,
    tags: [],
    covered: true,
    judgeable: true,
    platform: p.platform,
    url: p.url || (p.platform === "lc" ? `https://leetcode.com/problems/${p.problem_id}/` : `https://codeforces.com/problemset/problem/${p.problem_id}/`),
  }));

  const handles = [duel.player1_id || "player1"];
  if (duel.player2_id) handles.push(duel.player2_id);

  const results: Record<string, Record<string, number>> = {};
  for (const h of handles) results[h] = {};

  return {
    id: String(duel.id || duel.duel_id),
    mode: duel.mode || "dsa_blitz",
    createdAtSeconds: Math.floor(Date.now() / 1000),
    handles,
    displayHandles: Object.fromEntries(handles.map((h) => [h, h])),
    ratings: {},
    baselineSubmissionId: {},
    problems,
    results,
    status: duel.status === "finished" ? "finished" : "active",
  };
}

export async function createSession(mode: BlitzMode, handle: string, rivalHandle?: string, totalGames: number = 3): Promise<BlitzSession> {
  const isBotMatch = !rivalHandle || rivalHandle.toLowerCase() === "cp-bot" || rivalHandle.toLowerCase() === "bot" || rivalHandle.toLowerCase() === "z4s";
  const actualRival = isBotMatch ? null : rivalHandle;

  try {
    const res = await fetch(`${API_ORIGIN}/api/bot/duels/create`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        mode,
        player1_id: handle,
        player2_id: actualRival,
        is_bot_match: isBotMatch,
        total_games: totalGames,
      }),
    });
    if (res.ok) {
      const data = await res.json();
      return transformDuelPayload(data);
    }
  } catch {
    // Fallback to server /api/blitz/sessions below
  }

  const data = await request<{ session?: BlitzSession } & Record<string, any>>("/sessions", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ mode, handle, rivalHandle: actualRival }),
  });

  if (data.session) return data.session;
  return transformDuelPayload(data);
}

export async function getSession(id: string): Promise<BlitzSession> {
  const isUuid = id.includes("-");
  if (!isUuid) {
    try {
      const res = await fetch(`${API_ORIGIN}/api/bot/duels/state/${id}`);
      if (res.ok) {
        const data = await res.json();
        return transformDuelPayload(data);
      }
    } catch {
      // Fallback below
    }
  }

  const data = await request<{ session?: BlitzSession } & Record<string, any>>(`/sessions/${id}`);
  if (data.session) return data.session;
  return transformDuelPayload(data);
}

export async function endSession(id: string): Promise<void> {
  // session ends automatically when solved or forfeited
}
