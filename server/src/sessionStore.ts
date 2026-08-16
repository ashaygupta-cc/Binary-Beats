/**
 * Session store — backed by Neon (PostgreSQL) via Drizzle ORM with in-memory fallback cache.
 * Protects against database storage quotas (e.g. 512MB Neon limits) without crashing requests.
 */
import { eq, sql } from "drizzle-orm";
import { db } from "./db/index.js";
import { blitzSessions } from "./db/schema.js";
import type { BlitzSession } from "./blitzSession.js";
import type { SessionProblem } from "./blitzAlgorithm.js";

// ── memory fallback cache ───────────────────────────────────────────────────

const memorySessions = new Map<string, BlitzSession>();

// ── helpers ───────────────────────────────────────────────────────────────────

function rowToSession(row: typeof blitzSessions.$inferSelect): BlitzSession {
  return {
    id: row.id,
    mode: row.mode as BlitzSession["mode"],
    handles: row.handles as string[],
    displayHandles: row.displayHandles as Record<string, string>,
    ratings: row.ratings as Record<string, number | null>,
    baselineSubmissionId: row.baselineSubmissionId as Record<string, number>,
    problems: row.problems as SessionProblem[],
    results: row.results as Record<string, Record<string, number>>,
    solveSources: (row.solveSources ?? undefined) as BlitzSession["solveSources"],
    status: row.status as BlitzSession["status"],
    createdAtSeconds: row.createdAtSeconds,
    finishedAtSeconds: row.finishedAtSeconds ?? undefined,
  };
}

function sessionToRow(session: BlitzSession): typeof blitzSessions.$inferInsert {
  return {
    id: session.id,
    mode: session.mode,
    handles: session.handles,
    displayHandles: session.displayHandles,
    ratings: session.ratings,
    baselineSubmissionId: session.baselineSubmissionId,
    problems: session.problems as object[],
    results: session.results,
    solveSources: session.solveSources ?? null,
    status: session.status,
    createdAtSeconds: session.createdAtSeconds,
    finishedAtSeconds: session.finishedAtSeconds ?? null,
  };
}

// ── public API ─────────────────────────────────────────────────────────────────

export async function saveSession(session: BlitzSession): Promise<void> {
  memorySessions.set(session.id, session);
  try {
    await db
      .insert(blitzSessions)
      .values(sessionToRow(session))
      .onConflictDoUpdate({
        target: blitzSessions.id,
        set: {
          results: sql`excluded.results`,
          solveSources: sql`excluded.solve_sources`,
          status: sql`excluded.status`,
          finishedAtSeconds: sql`excluded.finished_at_seconds`,
          problems: sql`excluded.problems`,
        },
      });
  } catch (err: any) {
    console.warn("[sessionStore] Database save failed, serving session from memory fallback:", err?.message || err);
  }
}

export async function getSession(id: string): Promise<BlitzSession | undefined> {
  if (memorySessions.has(id)) {
    return memorySessions.get(id);
  }
  try {
    const rows = await db
      .select()
      .from(blitzSessions)
      .where(eq(blitzSessions.id, id))
      .limit(1);
    if (rows[0]) {
      const sess = rowToSession(rows[0]);
      memorySessions.set(id, sess);
      return sess;
    }
  } catch (err: any) {
    console.warn("[sessionStore] Database read failed:", err?.message || err);
  }
  return undefined;
}

export async function deleteSession(id: string): Promise<void> {
  memorySessions.delete(id);
  try {
    await db.delete(blitzSessions).where(eq(blitzSessions.id, id));
  } catch (err: any) {
    console.warn("[sessionStore] Database delete failed:", err?.message || err);
  }
}

export async function listActiveSessions(): Promise<BlitzSession[]> {
  try {
    const rows = await db
      .select()
      .from(blitzSessions)
      .where(eq(blitzSessions.status, "active"));
    const list = rows.map(rowToSession);
    for (const s of list) memorySessions.set(s.id, s);
    return list;
  } catch (err: any) {
    console.warn("[sessionStore] Database listActive failed, falling back to memory:", err?.message || err);
    return Array.from(memorySessions.values()).filter((s) => s.status === "active");
  }
}

export async function sweepStaleSessions(): Promise<void> {
  const now = Math.floor(Date.now() / 1000);
  const maxAgeS = 6 * 60 * 60;         // 6 h since creation
  const finishedRetentionS = 30 * 60;  // 30 min after finishing

  for (const [id, session] of memorySessions.entries()) {
    if (
      session.createdAtSeconds < now - maxAgeS ||
      (session.status === "finished" &&
        session.finishedAtSeconds &&
        session.finishedAtSeconds < now - finishedRetentionS)
    ) {
      memorySessions.delete(id);
    }
  }

  try {
    await db
      .delete(blitzSessions)
      .where(
        sql`(${blitzSessions.createdAtSeconds} < ${now - maxAgeS})
         OR (${blitzSessions.status} = 'finished'
             AND ${blitzSessions.finishedAtSeconds} IS NOT NULL
             AND ${blitzSessions.finishedAtSeconds} < ${now - finishedRetentionS})`
      );
  } catch (err: any) {
    console.warn("[sessionStore] Database sweep failed:", err?.message || err);
  }
}
