import { Router, Request, Response } from "express";
import { CfApiError, fetchUserInfo, fetchUserStatus, problemKey } from "../codeforces.js";
import { getProblemset } from "../problemCache.js";
import { NoProblemsError, buildDuelTargets, buildSoloTargets, effectiveRating, selectProblems } from "../blitzAlgorithm.js";
import { createSession, type BlitzMode } from "../blitzSession.js";
import { deleteSession, getSession, saveSession } from "../sessionStore.js";
import { getJudgeableKeys, hasStatement } from "../problemDb.js";

const router = Router();

function handleError(res: Response, e: unknown) {
  if (e instanceof NoProblemsError) {
    res.status(409).json({ error: "NO_PROBLEMS", message: `Couldn't find enough unsolved problems near rating ${e.target}.` });
    return;
  }
  if (e instanceof CfApiError) {
    res.status(e.kind === "NOT_FOUND" ? 404 : e.kind === "RATE_LIMITED" ? 429 : 502).json({ error: e.kind, message: e.message });
    return;
  }
  console.error(e);
  res.status(500).json({ error: "INTERNAL", message: "Unexpected server error." });
}

interface CreateSessionBody {
  mode?: BlitzMode;
  handle?: string;
  rivalHandle?: string;
}

// POST /api/blitz/sessions
router.post("/sessions", async (req: Request, res: Response) => {
  const body = (req.body ?? {}) as CreateSessionBody;
  const mode = (body.mode || "dsa_blitz") as BlitzMode;
  const handle = body.handle?.trim() || "player";
  const rivalHandle = body.rivalHandle?.trim();

  const BOT_API_URL = process.env.BOT_API_URL;
  const BB_API_KEY = process.env.BB_API_KEY ?? "";

  if (BOT_API_URL) {
    try {
      const upstream = await fetch(`${BOT_API_URL.replace(/\/+$/, "")}/api/duels/create`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(BB_API_KEY ? { "X-BB-Key": BB_API_KEY } : {}),
        },
        body: JSON.stringify({
          mode,
          player1_id: handle,
          player2_id: rivalHandle || null,
          is_bot_match: !rivalHandle,
          total_games: 3,
        }),
        signal: AbortSignal.timeout(15_000),
      });
      if (upstream.ok) {
        const data = await upstream.json();
        return res.json(data);
      }
    } catch (err) {
      console.warn("[blitz] CP-Bot API call failed, using local database fallback:", err);
    }
  }

  // Fallback: Create session using local database
  try {
    const isLc = mode.startsWith("dsa");
    const poolLC = [
      { index: "two-sum", name: "Two Sum", rating: 800, url: "https://leetcode.com/problems/two-sum/" },
      { index: "valid-parentheses", name: "Valid Parentheses", rating: 900, url: "https://leetcode.com/problems/valid-parentheses/" },
      { index: "merge-two-sorted-lists", name: "Merge Two Sorted Lists", rating: 1000, url: "https://leetcode.com/problems/merge-two-sorted-lists/" },
      { index: "best-time-to-buy-and-sell-stock", name: "Best Time to Buy and Sell Stock", rating: 1100, url: "https://leetcode.com/problems/best-time-to-buy-and-sell-stock/" },
      { index: "climbing-stairs", name: "Climbing Stairs", rating: 1000, url: "https://leetcode.com/problems/climbing-stairs/" },
      { index: "add-two-numbers", name: "Add Two Numbers", rating: 1200, url: "https://leetcode.com/problems/add-two-numbers/" },
      { index: "longest-substring-without-repeating-characters", name: "Longest Substring Without Repeating Characters", rating: 1400, url: "https://leetcode.com/problems/longest-substring-without-repeating-characters/" },
      { index: "3sum", name: "3Sum", rating: 1500, url: "https://leetcode.com/problems/3sum/" },
      { index: "container-with-most-water", name: "Container With Most Water", rating: 1400, url: "https://leetcode.com/problems/container-with-most-water/" },
      { index: "group-anagrams", name: "Group Anagrams", rating: 1300, url: "https://leetcode.com/problems/group-anagrams/" },
      { index: "reverse-linked-list", name: "Reverse Linked List", rating: 900, url: "https://leetcode.com/problems/reverse-linked-list/" },
      { index: "binary-tree-inorder-traversal", name: "Binary Tree Inorder Traversal", rating: 950, url: "https://leetcode.com/problems/binary-tree-inorder-traversal/" },
    ];

    const poolCF = [
      { contestId: 4, index: "A", name: "Watermelon", rating: 800, url: "https://codeforces.com/problemset/problem/4/A" },
      { contestId: 71, index: "A", name: "Way Too Long Words", rating: 800, url: "https://codeforces.com/problemset/problem/71/A" },
      { contestId: 231, index: "A", name: "Team", rating: 800, url: "https://codeforces.com/problemset/problem/231/A" },
      { contestId: 158, index: "A", name: "Next Round", rating: 800, url: "https://codeforces.com/problemset/problem/158/A" },
      { contestId: 282, index: "A", name: "Bit++", rating: 800, url: "https://codeforces.com/problemset/problem/282/A" },
      { contestId: 50, index: "A", name: "Domino piling", rating: 800, url: "https://codeforces.com/problemset/problem/50/A" },
      { contestId: 263, index: "A", name: "Beautiful Matrix", rating: 800, url: "https://codeforces.com/problemset/problem/263/A" },
      { contestId: 112, index: "A", name: "Petya and Strings", rating: 800, url: "https://codeforces.com/problemset/problem/112/A" },
      { contestId: 339, index: "A", name: "Helpful Maths", rating: 800, url: "https://codeforces.com/problemset/problem/339/A" },
      { contestId: 266, index: "A", name: "Stones on the Table", rating: 800, url: "https://codeforces.com/problemset/problem/266/A" },
      { contestId: 546, index: "A", name: "Soldier and Bananas", rating: 800, url: "https://codeforces.com/problemset/problem/546/A" },
      { contestId: 791, index: "A", name: "Bear and Big Brother", rating: 800, url: "https://codeforces.com/problemset/problem/791/A" },
    ];

    const pool = isLc ? poolLC : poolCF;
    const shuffled = [...pool].sort(() => Math.random() - 0.5);
    const problems = shuffled.slice(0, 3).map((p: any) => ({
      contestId: p.contestId || 0,
      index: p.index,
      name: p.name,
      rating: p.rating,
      tags: [],
      covered: true,
      judgeable: true,
      platform: isLc ? "lc" : "cf",
      url: p.url,
    }));

    const handles = [handle];
    if (rivalHandle) handles.push(rivalHandle);
    const session = createSession(mode, handles, { [handle.toLowerCase()]: 800 }, { [handle.toLowerCase()]: 0 }, problems);
    await saveSession(session);

    res.json({ session });
  } catch (e: any) {
    console.error("Local session creation error:", e);
    res.status(500).json({ error: "INTERNAL", message: e.message || "Failed to create session." });
  }
});

// GET /api/blitz/sessions/:id
router.get("/sessions/:id", async (req: Request, res: Response) => {
  try {
    const session = await getSession(req.params.id as string);
    if (!session) {
      return res.status(404).json({ error: "NOT_FOUND", message: "Session not found (it may have expired)." });
    }
    res.json({ session });
  } catch (error: any) {
    console.error("Get session error:", error);
    res.status(500).json({ error: "INTERNAL", message: error.message });
  }
});

// POST /api/blitz/sessions/:id/end
router.post("/sessions/:id/end", async (req: Request, res: Response) => {
  try {
    const session = await getSession(req.params.id as string);
    if (!session) {
      return res.status(404).json({ error: "NOT_FOUND", message: "Session not found." });
    }
    await deleteSession(req.params.id as string);
    res.status(204).end();
  } catch (error: any) {
    console.error("End session error:", error);
    res.status(500).json({ error: "INTERNAL", message: error.message });
  }
});

export default router;
