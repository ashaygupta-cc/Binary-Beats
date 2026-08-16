import { Router, Request, Response } from "express";
import { authDb } from "../db/authDb.js";
import { users } from "../db/schema.js";

const router = Router();

// Deterministic mock rating based on username to make standings look rich and consistent
function getDeterministicStats(name: string, id: string) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = (hash << 5) - hash + name.charCodeAt(i);
    hash |= 0;
  }
  const rating = 1000 + Math.abs(hash % 1800);
  const solvedCount = 10 + Math.abs(hash % 450);
  return { rating, solvedCount };
}

async function getLeaderboardData() {
  if (!authDb) return [];
  try {
    const dbUsers = await authDb.select().from(users).limit(100);
    return dbUsers.map((u) => {
      const stats = getDeterministicStats(u.name, u.id);
      return {
        userId: u.id,
        username: u.email.split("@")[0] || u.name.toLowerCase().replace(/\s+/g, "_"),
        displayName: u.name,
        rating: stats.rating,
        solvedCount: stats.solvedCount,
        lastSolvedAt: new Date(u.createdAt.getTime() + 60000),
      };
    });
  } catch (error) {
    console.error("Error building leaderboard data:", error);
    return [];
  }
}

// GET /api/leaderboard/daily
router.get("/daily", async (req: Request, res: Response) => {
  try {
    const raw = await getLeaderboardData();
    const sorted = raw.sort((a, b) => b.rating - a.rating).slice(0, 50);
    res.status(200).json({ leaderboard: sorted });
  } catch (error: any) {
    console.error("Daily leaderboard error:", error);
    res.status(500).json({ message: error.message });
  }
});

// GET /api/leaderboard/weekly
router.get("/weekly", async (req: Request, res: Response) => {
  try {
    const raw = await getLeaderboardData();
    const sorted = raw.sort((a, b) => b.solvedCount - a.solvedCount).slice(0, 50);
    res.status(200).json({ leaderboard: sorted });
  } catch (error: any) {
    console.error("Weekly leaderboard error:", error);
    res.status(500).json({ message: error.message });
  }
});

export default router;
