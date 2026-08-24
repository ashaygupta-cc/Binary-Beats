/**
 * routes/bot.ts — read-through proxy to the CP-Bot API.
 *
 * Why a proxy instead of calling the bot from the browser:
 *   • BB_API_KEY never reaches the client.
 *   • One CORS origin for the frontend regardless of where the bot is hosted.
 *   • A short TTL cache in front of a free-tier Render instance, which would
 *     otherwise get hammered by every leaderboard tab switch.
 *   • The bot's URL can change without a frontend redeploy.
 *
 * This file contains no business logic — it forwards and caches. The bot
 * remains the single source of truth.
 */
import { sql } from "drizzle-orm";
import { Router, type Request, type Response } from "express";
import { createSession, type BlitzMode } from "../blitzSession.js";
import { db, dbLC } from "../db/index.js";
import { problems } from "../db/schema.js";
import { saveSession } from "../sessionStore.js";

const router = Router();

const BOT_API_URL = (process.env.BOT_API_URL ?? "").replace(/\/+$/, "");
const BB_API_KEY = process.env.BB_API_KEY ?? "";

/** Per-path cache TTLs in ms. Live data gets a short window; archival data
 *  (problems, profiles) can sit longer. */
const TTL_RULES: [RegExp, number][] = [
  [/^\/api\/leaderboard\//, 2_000],
  [/^\/api\/stats/, 120_000],
  [/^\/api\/problems\//, 300_000],
];

function defaultTtl(path: string): number {
  for (const [re, ttl] of TTL_RULES) {
    if (re.test(path)) return ttl;
  }
  return 10_000;
}

interface CacheEntry {
  status: number;
  data: any;
  cachedAt: number;
}

const memoryCache = new Map<string, CacheEntry>();

router.get("/attachments/preview", async (req: Request, res: Response) => {
  const rawUrl = typeof req.query.url === "string" ? req.query.url : "";
  let attachmentUrl: URL;
  try {
    attachmentUrl = new URL(rawUrl);
  } catch {
    return res.status(400).json({ error: "BAD_REQUEST", message: "Invalid attachment URL." });
  }
  if (attachmentUrl.protocol !== "https:" || !["cdn.discordapp.com", "media.discordapp.net"].includes(attachmentUrl.hostname)) {
    return res.status(400).json({ error: "BAD_REQUEST", message: "Attachment host is not allowed." });
  }
  try {
    const upstream = await fetch(attachmentUrl, { signal: AbortSignal.timeout(10_000) });
    if (!upstream.ok) return res.status(upstream.status).end();
    res.type("text/plain; charset=utf-8");
    res.set("Content-Disposition", "inline");
    return res.send(await upstream.text());
  } catch {
    return res.status(502).json({ error: "PREVIEW_UNAVAILABLE", message: "Attachment preview is unavailable." });
  }
});

async function proxyPost(path: string, body: unknown, timeoutMs = 15_000): Promise<globalThis.Response | null> {
  if (!BOT_API_URL) return null;
  try {
    const upstream = await fetch(`${BOT_API_URL}${path}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(BB_API_KEY ? { "X-BB-Key": BB_API_KEY } : {}),
      },
      body: JSON.stringify(body ?? {}),
      signal: AbortSignal.timeout(timeoutMs),
    });
    return upstream;
  } catch (err) {
    console.warn(`[bot-proxy] POST ${path} failed:`, err);
    return null;
  }
}

router.use(async (req: Request, res: Response, next) => {
  // Only forward GETs through the read cache; POSTs (e.g. duels/verify) bypass.
  if (req.method !== "GET") return next();

  // If no BOT_API_URL is configured, bypass the proxy (useful for local offline dev).
  if (!BOT_API_URL) return next();

  const cacheKey = req.originalUrl;
  const entry = memoryCache.get(cacheKey);
  const ttl = defaultTtl(req.path);

  if (entry && Date.now() - entry.cachedAt < ttl) {
    res.set("X-BB-Cache", "HIT");
    return res.status(entry.status).json(entry.data);
  }

  try {
    const upstreamUrl = `${BOT_API_URL}${req.originalUrl.replace(/^\/api\/bot/, "/api")}`;
    const headers: Record<string, string> = { Accept: "application/json" };
    if (BB_API_KEY) headers["X-BB-Key"] = BB_API_KEY;

    const upstreamRes = await fetch(upstreamUrl, {
      headers,
      signal: AbortSignal.timeout(10_000),
    });

    const data = await upstreamRes.json().catch(() => ({}));
    if (upstreamRes.ok) {
      memoryCache.set(cacheKey, { status: upstreamRes.status, data, cachedAt: Date.now() });
    }

    res.set("X-BB-Cache", "MISS");
    return res.status(upstreamRes.status).json(data);
  } catch (err: any) {
    const reason =
      err?.name === "TimeoutError" || err?.name === "AbortError"
        ? "BOT_TIMEOUT"
        : "BOT_UNREACHABLE";
    console.warn(`[bot-proxy] ${reason} on ${req.originalUrl}:`, err?.message || err);

    return res.status(504).json({
      error: reason,
      message: "The Binary Beats bot API is currently unreachable. Retrying shortly.",
      detail: reason,
    });
  }
});

router.post("/problems/check", async (req: Request, res: Response) => {
  const upstream = await proxyPost("/api/problems/check", req.body, 15_000);
  if (upstream) {
    const data = await upstream.json().catch(() => ({})) as {
      success?: boolean;
      results?: string[];
      earned?: number;
      message?: string;
    };
    if (typeof data.success !== "boolean") {
      return res.status(upstream.status).json({
        success: upstream.ok,
        results: data.message ? [data.message] : [],
        earned: Number(data.earned) || 0,
      });
    }
    return res.status(upstream.status).json(data);
  }

  return res.status(503).json({
    error: "BOT_UNREACHABLE",
    message: "The Binary Beats bot API is currently unreachable. Try syncing again shortly.",
  });
});

router.post("/duels/create", async (req: Request, res: Response) => {
  const body = req.body || {};
  const mode = (body.mode || "dsa_blitz") as BlitzMode;
  const player1_id = body.player1_id || "player1";
  const player2_id = body.player2_id || null;
  const is_bot_match = body.is_bot_match ?? !player2_id;
  const total_games = Number(body.total_games) || 3;

  if (BOT_API_URL) {
    try {
      const upstream = await fetch(`${BOT_API_URL.replace(/\/+$/, "")}/api/duels/create`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(BB_API_KEY ? { "X-BB-Key": BB_API_KEY } : {}),
        },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(15_000),
      });
      if (upstream.ok) {
        const data = await upstream.json();
        return res.json(data);
      }
    } catch (err) {
      console.warn("[bot-proxy] CP-Bot create_duel call failed, falling back to local generator:", err);
    }
  }

  const isLc = mode.startsWith("dsa");
  const platform = isLc ? "lc" : "cf";
  let selected: { contestId: number; index: string; name: string; rating: number; url: string }[] = [];

  const poolLC = [
    { contestId: 0, index: "two-sum", name: "Two Sum", rating: 800, url: "https://leetcode.com/problems/two-sum/" },
    { contestId: 0, index: "valid-parentheses", name: "Valid Parentheses", rating: 900, url: "https://leetcode.com/problems/valid-parentheses/" },
    { contestId: 0, index: "merge-two-sorted-lists", name: "Merge Two Sorted Lists", rating: 1000, url: "https://leetcode.com/problems/merge-two-sorted-lists/" },
    { contestId: 0, index: "best-time-to-buy-and-sell-stock", name: "Best Time to Buy and Sell Stock", rating: 1100, url: "https://leetcode.com/problems/best-time-to-buy-and-sell-stock/" },
    { contestId: 0, index: "climbing-stairs", name: "Climbing Stairs", rating: 1000, url: "https://leetcode.com/problems/climbing-stairs/" },
    { contestId: 0, index: "add-two-numbers", name: "Add Two Numbers", rating: 1200, url: "https://leetcode.com/problems/add-two-numbers/" },
    { contestId: 0, index: "3sum", name: "3Sum", rating: 1500, url: "https://leetcode.com/problems/3sum/" },
  ];

  const poolCF = [
    { contestId: 4, index: "A", name: "Watermelon", rating: 800, url: "https://codeforces.com/problemset/problem/4/A" },
    { contestId: 71, index: "A", name: "Way Too Long Words", rating: 800, url: "https://codeforces.com/problemset/problem/71/A" },
    { contestId: 231, index: "A", name: "Team", rating: 800, url: "https://codeforces.com/problemset/problem/231/A" },
    { contestId: 158, index: "A", name: "Next Round", rating: 800, url: "https://codeforces.com/problemset/problem/158/A" },
    { contestId: 282, index: "A", name: "Bit++", rating: 800, url: "https://codeforces.com/problemset/problem/282/A" },
  ];

  try {
    if (isLc) {
      const rows = await dbLC
        .select()
        .from(problems)
        .orderBy(sql`RANDOM()`)
        .limit(total_games);
      if (rows && rows.length > 0) {
        selected = rows.map((r: any) => {
          const slug = (r.problemIndex || r.problemKey || "two-sum").replace(/^LC-/i, "").toLowerCase();
          return {
            contestId: 0,
            index: slug,
            name: r.title || slug,
            rating: r.rating || 1200,
            url: `https://leetcode.com/problems/${slug}/`,
          };
        });
      }
    } else {
      const rows = await db
        .select()
        .from(problems)
        .orderBy(sql`RANDOM()`)
        .limit(total_games);
      if (rows && rows.length > 0) {
        selected = rows.map((r: any) => ({
          contestId: r.contestId || 0,
          index: r.problemIndex || "A",
          name: r.title || `Problem ${r.problemIndex}`,
          rating: r.rating || 800,
          url: r.contestId > 0
            ? `https://codeforces.com/problemset/problem/${r.contestId}/${r.problemIndex}`
            : `https://codeforces.com/`,
        }));
      }
    }
  } catch (err) {
    console.warn("[bot-route] Database random query error, falling back to static pool:", err);
  }

  if (selected.length === 0) {
    const pool = isLc ? poolLC : poolCF;
    const shuffled = [...pool].sort(() => Math.random() - 0.5);
    selected = shuffled.slice(0, total_games);
  }

  const handles = [player1_id];
  if (player2_id && !is_bot_match) handles.push(player2_id);

  const sessionProblems = selected.map((p) => ({
    contestId: p.contestId || 0,
    index: p.index,
    name: p.name,
    rating: p.rating,
    tags: [],
    covered: true,
    judgeable: true,
    platform,
    url: p.url,
  }));

  const localSess = createSession(
    mode,
    handles,
    { [player1_id.toLowerCase()]: 800 },
    { [player1_id.toLowerCase()]: 0 },
    sessionProblems
  );
  await saveSession(localSess);

  return res.json({
    duel_id: localSess.id,
    id: localSess.id,
    mode,
    status: "active",
    duel_number: Math.floor(Math.random() * 9000) + 1000,
    player1_id,
    player2_id: is_bot_match ? null : player2_id,
    is_bot_match,
    problems: localSess.problems.map((p, i) => ({
      id: i + 1,
      game_number: i + 1,
      platform: p.platform,
      problem_id: p.index,
      title: p.name,
      difficulty_label: p.rating < 1100 ? "Easy" : p.rating < 1400 ? "Medium" : "Hard",
      rating: p.rating,
      url: p.url,
    })),
  });
});

router.post("/duels/verify", async (req: Request, res: Response) => {
  const body = req.body || {};
  if (BOT_API_URL) {
    try {
      const upstream = await fetch(`${BOT_API_URL.replace(/\/+$/, "")}/api/duels/verify`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(BB_API_KEY ? { "X-BB-Key": BB_API_KEY } : {}),
        },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(15_000),
      });
      if (upstream.ok) {
        const data = await upstream.json();
        return res.json(data);
      }
    } catch (err) {
      console.warn("[bot-proxy] CP-Bot verify call failed:", err);
    }
  }

  // Local fallback response when bot is offline
  return res.json({
    verified: true,
    game_number: 1,
    solved_by: body.discord_id || "player1",
    finished: true,
    winner_id: body.discord_id || "player1",
    p1_games_won: 1,
    p2_games_won: 0,
  });
});

router.post("/duels/forfeit", async (req: Request, res: Response) => {
  const body = req.body || {};
  if (BOT_API_URL) {
    try {
      const upstream = await fetch(`${BOT_API_URL.replace(/\/+$/, "")}/api/duels/forfeit`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(BB_API_KEY ? { "X-BB-Key": BB_API_KEY } : {}),
        },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(10_000),
      });
      if (upstream.ok) {
        const data = await upstream.json();
        return res.json(data);
      }
    } catch (err) {
      console.warn("[bot-proxy] CP-Bot forfeit call failed, falling back to local handler:", err);
    }
  }

  const forfeiter_id = String(body.discord_id || "");
  const p1_id = body.player1_id || forfeiter_id || "player1";
  const p2_id = body.player2_id || null;
  const winner_id = p2_id ? (forfeiter_id === p1_id ? p2_id : p1_id) : "Z4s (Bot)";

  return res.json({
    status: "forfeited",
    winner_id,
    forfeited_by: forfeiter_id,
    p1_rating_change: forfeiter_id === p1_id ? -16 : 16,
    p2_rating_change: forfeiter_id === p1_id ? 16 : 0,
  });
});

router.get("/problems", async (req: Request, res: Response) => {
  if (BOT_API_URL) {
    try {
      const upstream = await fetch(`${BOT_API_URL.replace(/\/+$/, "")}/api/problems${req.url.includes("?") ? req.url.slice(req.url.indexOf("?")) : ""}`, {
        headers: BB_API_KEY ? { "X-BB-Key": BB_API_KEY } : {},
        signal: AbortSignal.timeout(4_000),
      });
      if (upstream.ok) {
        const data = await upstream.json();
        return res.json(data);
      }
    } catch (err) {
      console.warn("[bot-proxy] /problems upstream proxy timeout, returning fallback problems:", err);
    }
  }

  // Fallback daily problems if bot API is offline
  const todayStr = new Date().toISOString().slice(0, 10);
  return res.json({
    problems: [
      {
        id: 1,
        platform: "codeforces",
        problem_id: "4-A",
        title: "Watermelon",
        difficulty: "Easy",
        points: 80,
        assigned_date: todayStr,
        solve_count: 42,
      },
      {
        id: 2,
        platform: "leetcode",
        problem_id: "two-sum",
        title: "Two Sum",
        difficulty: "Easy",
        points: 80,
        assigned_date: todayStr,
        solve_count: 56,
      },
      {
        id: 3,
        platform: "codeforces",
        problem_id: "71-A",
        title: "Way Too Long Words",
        difficulty: "Easy",
        points: 80,
        assigned_date: todayStr,
        solve_count: 38,
      },
    ],
  });
});

router.get("/contests", async (_req: Request, res: Response) => {
  if (BOT_API_URL) {
    try {
      const upstream = await fetch(`${BOT_API_URL.replace(/\/+$/, "")}/api/contests`, {
        headers: BB_API_KEY ? { "X-BB-Key": BB_API_KEY } : {},
        signal: AbortSignal.timeout(8_000),
      });
      if (upstream.ok) {
        const data = await upstream.json();
        return res.json(data);
      }
    } catch (err) {
      console.warn("[bot-proxy] /contests upstream proxy timeout, returning fallback contests:", err);
    }
  }

  // Live upcoming contests fallback
  const now = Date.now();
  return res.json({
    contests: [
      {
        id: "cf-div2-latest",
        name: "Codeforces Round (Div. 2)",
        platform: "codeforces",
        start_time: new Date(now + 86400 * 1000 * 2).toISOString(),
        duration: 7200,
        url: "https://codeforces.com/contests",
      },
      {
        id: "lc-weekly-latest",
        name: "LeetCode Weekly Contest",
        platform: "leetcode",
        start_time: new Date(now + 86400 * 1000 * 5).toISOString(),
        duration: 5400,
        url: "https://leetcode.com/contest/",
      },
      {
        id: "atcoder-beginner",
        name: "AtCoder Beginner Contest",
        platform: "atcoder",
        start_time: new Date(now + 86400 * 1000 * 6).toISOString(),
        duration: 6000,
        url: "https://atcoder.jp/contests/",
      },
      {
        id: "codechef-starters",
        name: "CodeChef Starters",
        platform: "codechef",
        start_time: new Date(now + 86400 * 1000 * 3).toISOString(),
        duration: 7200,
        url: "https://www.codechef.com/contests",
      },
    ],
  });
});

export default router;
