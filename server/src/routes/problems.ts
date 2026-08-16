import { Router, Request, Response } from "express";
import { getStatement, listProblems } from "../problemDb.js";

const router = Router();
const KEY_RE = /^[A-Z0-9_-]+$/i;

// GET /api/problems/:key/statement?platform=leetcode|atcoder|codechef|codeforces
router.get("/:key/statement", async (req: Request, res: Response) => {
  try {
    const key = (req.params.key as string).trim();
    if (!KEY_RE.test(key)) {
      return res.status(400).json({ error: "BAD_REQUEST", message: "Invalid problem key." });
    }
    const platform = typeof req.query.platform === "string" && req.query.platform.trim()
      ? req.query.platform.trim().toLowerCase()
      : undefined;

    const problem = await getStatement(key, platform);
    if (!problem) {
      return res.status(404).json({ error: "NOT_COVERED", message: "This problem isn't in the database." });
    }

    res.set("Cache-Control", "public, max-age=3600");
    res.json({ problem });
  } catch (error: any) {
    console.error("Get statement error:", error);
    res.status(500).json({ error: "INTERNAL", message: error.message });
  }
});

// GET /api/problems
router.get("/", async (req: Request, res: Response) => {
  try {
    const q = req.query;

    const search = typeof q.search === "string" && q.search.trim() ? q.search.trim() : undefined;
    const tags =
      typeof q.tags === "string" && q.tags.trim()
        ? q.tags.split(",").map((t) => t.trim()).filter(Boolean)
        : undefined;
    const ratingMin = typeof q.ratingMin === "string" ? Number(q.ratingMin) || undefined : undefined;
    const ratingMax = typeof q.ratingMax === "string" ? Number(q.ratingMax) || undefined : undefined;
    const difficulty =
      typeof q.difficulty === "string" && ["easy", "medium", "hard"].includes(q.difficulty)
        ? (q.difficulty as "easy" | "medium" | "hard")
        : undefined;
    const platform = typeof q.platform === "string" && q.platform.trim() ? q.platform.trim() : undefined;
    const page = typeof q.page === "string" ? Math.max(1, parseInt(q.page) || 1) : 1;
    const pageSize = typeof q.pageSize === "string" ? Math.min(100, parseInt(q.pageSize) || 50) : 50;

    const result = await listProblems({ search, tags, ratingMin, ratingMax, difficulty, platform, page, pageSize });

    res.set("Cache-Control", "public, max-age=60");
    res.json(result);
  } catch (error: any) {
    console.error("List problems error:", error);
    res.status(500).json({ error: "INTERNAL", message: error.message });
  }
});

export default router;
