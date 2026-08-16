import { Router, Request, Response } from "express";
import { CfApiError, fetchUserInfo, fetchUserRating, fetchUserStatus } from "../codeforces.js";

const RATING_HISTORY_LIMIT = 20;
const RATING_HISTORY_TTL_MS = 5 * 60 * 1000;

interface RatingHistoryEntry {
  contestId: number;
  contestName: string;
  newRating: number;
  oldRating: number;
  ratingUpdateTimeSeconds: number;
}

const ratingHistoryCache = new Map<string, { fetchedAt: number; history: RatingHistoryEntry[] }>();

const router = Router();

function handleCfError(res: Response, e: unknown) {
  if (e instanceof CfApiError) {
    res.status(e.kind === "NOT_FOUND" ? 404 : e.kind === "RATE_LIMITED" ? 429 : 502);
    res.json({ error: e.kind, message: e.message });
    return;
  }
  res.status(500).json({ error: "INTERNAL", message: "Unexpected server error." });
}

// GET /api/cf/user/:handles
router.get("/user/:handles", async (req: Request, res: Response) => {
  const handlesParam = req.params.handles as string;
  const handles = handlesParam
    .split(";")
    .map((h: string) => h.trim())
    .filter(Boolean);

  if (handles.length === 0) {
    return res.status(400).json({ error: "BAD_REQUEST", message: "At least one handle is required." });
  }

  try {
    const users = await fetchUserInfo(handles);
    res.json({
      users: users.map((u) => ({
        handle: u.handle,
        rating: u.rating ?? null,
        maxRating: u.maxRating ?? null,
        rank: u.rank ?? null,
      })),
    });
  } catch (e) {
    handleCfError(res, e);
  }
});

// GET /api/cf/status/:handle
router.get("/status/:handle", async (req: Request, res: Response) => {
  const handle = req.params.handle as string;
  const countParam = req.query.count;
  const count = typeof countParam === "string" && countParam ? Number(countParam) : undefined;

  try {
    const submissions = await fetchUserStatus(handle, count);
    res.json({
      submissions: submissions.map((s) => ({
        id: s.id,
        creationTimeSeconds: s.creationTimeSeconds,
        verdict: s.verdict ?? null,
        problem: { contestId: s.problem.contestId, index: s.problem.index },
      })),
    });
  } catch (e) {
    handleCfError(res, e);
  }
});

// GET /api/cf/user/:handle/rating-history
router.get("/user/:handle/rating-history", async (req: Request, res: Response) => {
  const handle = req.params.handle as string;
  const key = handle.toLowerCase();
  const cached = ratingHistoryCache.get(key);
  if (cached && Date.now() - cached.fetchedAt < RATING_HISTORY_TTL_MS) {
    return res.json({ history: cached.history });
  }

  try {
    const changes = await fetchUserRating(handle);
    const recent: RatingHistoryEntry[] = changes.slice(-RATING_HISTORY_LIMIT).map((c) => ({
      contestId: c.contestId,
      contestName: c.contestName,
      newRating: c.newRating,
      oldRating: c.oldRating,
      ratingUpdateTimeSeconds: c.ratingUpdateTimeSeconds,
    }));
    ratingHistoryCache.set(key, { fetchedAt: Date.now(), history: recent });
    res.json({ history: recent });
  } catch (e) {
    handleCfError(res, e);
  }
});

export default router;
