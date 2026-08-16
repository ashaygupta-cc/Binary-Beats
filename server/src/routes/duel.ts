import { randomUUID } from "node:crypto";
import { Router, Request, Response } from "express";
import { and, gte, lte, eq } from "drizzle-orm";
import { requireAuth } from "../middleware/auth.js";
import { authDb } from "../db/authDb.js";
import { db as pgDb } from "../db/index.js";
import { users, problems as problemsTable } from "../db/schema.js";

const router = Router();
const MAX_RATING_GAP = 300;

interface DuelRecord {
  id: string;
  player1: { id: string; name: string; rating: number };
  player2: { id: string; name: string; rating: number };
  mode: "cp" | "dsa";
  status: "pending" | "in_progress" | "declined" | "completed";
  problem?: any;
  problems?: any[];
  winner?: string;
  createdAt: Date;
}

// In-memory store for duels
const duelStore = new Map<string, DuelRecord>();

async function getDbUser(id: string) {
  if (!authDb) return null;
  const rows = await authDb.select().from(users).where(eq(users.id, id)).limit(1);
  return rows[0] || null;
}

async function pickProblemNearRating(targetRating: number) {
  const ranges = [100, 200, 300];
  for (const spread of ranges) {
    const candidates = await pgDb
      .select()
      .from(problemsTable)
      .where(
        and(
          gte(problemsTable.rating, targetRating - spread),
          lte(problemsTable.rating, targetRating + spread)
        )
      )
      .limit(100);

    if (candidates.length > 0) {
      return candidates[Math.floor(Math.random() * candidates.length)];
    }
  }
  // Ultimate fallback: get any problem
  const fallbackList = await pgDb.select().from(problemsTable).limit(10);
  return fallbackList[0] || null;
}

async function pickProblemsForDSA() {
  // DSA mode fallback using rating ranges
  const [easyList, mediumList, hardList] = await Promise.all([
    pgDb.select().from(problemsTable).where(lte(problemsTable.rating, 1200)).limit(20),
    pgDb.select().from(problemsTable).where(and(gte(problemsTable.rating, 1300), lte(problemsTable.rating, 1800))).limit(20),
    pgDb.select().from(problemsTable).where(gte(problemsTable.rating, 1900)).limit(20),
  ]);

  const pickRandom = (arr: any[]) => arr[Math.floor(Math.random() * arr.length)] || null;

  return [
    pickRandom(easyList),
    pickRandom(mediumList),
    pickRandom(hardList),
  ].filter(Boolean);
}

// POST /api/duel/challenge
router.post("/challenge", requireAuth, async (req: Request, res: Response) => {
  try {
    const { opponentId, mode = "cp" } = req.body as { opponentId?: string; mode?: "cp" | "dsa" };
    const userId = req.user?.sub;

    if (!userId) return res.status(401).json({ message: "Unauthorized" });
    if (!opponentId) return res.status(400).json({ message: "Opponent ID is required" });
    if (opponentId === userId) return res.status(400).json({ message: "Cannot duel yourself" });

    const [player1Db, player2Db] = await Promise.all([
      getDbUser(userId),
      getDbUser(opponentId),
    ]);

    if (!player1Db || !player2Db) {
      return res.status(404).json({ message: "One or both players not found in database" });
    }

    // Default ratings since rating is not a column in schema
    const player1Rating = 1200;
    const player2Rating = 1200;

    const ratingGap = Math.abs(player1Rating - player2Rating);
    if (ratingGap > MAX_RATING_GAP) {
      return res.status(400).json({ message: `Rating gap too large (${ratingGap})` });
    }

    const duelId = randomUUID();
    const duelData: DuelRecord = {
      id: duelId,
      player1: { id: player1Db.id, name: player1Db.name, rating: player1Rating },
      player2: { id: player2Db.id, name: player2Db.name, rating: player2Rating },
      mode,
      status: "pending",
      createdAt: new Date(),
    };

    if (mode === "dsa") {
      const selected = await pickProblemsForDSA();
      if (selected.length < 3) {
        return res.status(500).json({ message: "Problem pool is incomplete" });
      }
      duelData.problems = selected;
    } else {
      const avgRating = (player1Rating + player2Rating) / 2;
      const problem = await pickProblemNearRating(avgRating);
      if (!problem) {
        return res.status(404).json({ message: "No suitable problem found" });
      }
      duelData.problem = problem;
    }

    duelStore.set(duelId, duelData);

    res.status(201).json({
      duel: {
        id: duelData.id,
        mode: duelData.mode,
        status: duelData.status,
        opponent: { id: player2Db.id, username: player2Db.name, rating: player2Rating },
        problem: duelData.problem,
        problems: duelData.problems,
      },
    });
  } catch (error: any) {
    console.error("Challenge user error:", error);
    res.status(500).json({ message: error.message });
  }
});

// GET /api/duel/pending
router.get("/pending", requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = req.user?.sub;
    if (!userId) return res.status(401).json({ message: "Unauthorized" });

    const pendingDuels = Array.from(duelStore.values())
      .filter((d) => d.player2.id === userId && d.status === "pending")
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

    // Map fields to match mongoose population style
    const mapped = pendingDuels.map((d) => ({
      _id: d.id,
      player1: { _id: d.player1.id, username: d.player1.name, rating: d.player1.rating },
      player2: { _id: d.player2.id, username: d.player2.name, rating: d.player2.rating },
      mode: d.mode,
      status: d.status,
      problem: d.problem ? { title: d.problem.title, difficultyRating: d.problem.rating } : undefined,
      problems: d.problems,
      createdAt: d.createdAt,
    }));

    res.status(200).json({ pendingDuels: mapped });
  } catch (error: any) {
    console.error("Get pending duels error:", error);
    res.status(500).json({ message: error.message });
  }
});

// POST /api/duel/:duelId/accept
router.post("/:duelId/accept", requireAuth, async (req: Request, res: Response) => {
  try {
    const duelId = req.params.duelId as string;
    const userId = req.user?.sub;

    const duel = duelStore.get(duelId);
    if (!duel) {
      return res.status(404).json({ message: "Duel not found" });
    }
    if (duel.status !== "pending") {
      return res.status(400).json({ message: "Duel is not pending" });
    }
    if (duel.player2.id !== userId) {
      return res.status(403).json({ message: "Only the challenged player can accept this duel" });
    }

    duel.status = "in_progress";
    duelStore.set(duelId, duel);

    res.status(200).json({
      duel: { id: duel.id, status: duel.status, problem: duel.problem },
    });
  } catch (error: any) {
    console.error("Accept duel error:", error);
    res.status(500).json({ message: error.message });
  }
});

// POST /api/duel/:duelId/decline
router.post("/:duelId/decline", requireAuth, async (req: Request, res: Response) => {
  try {
    const duelId = req.params.duelId as string;
    const userId = req.user?.sub;

    const duel = duelStore.get(duelId);
    if (!duel) {
      return res.status(404).json({ message: "Duel not found" });
    }
    if (duel.status !== "pending") {
      return res.status(400).json({ message: "Duel is not pending" });
    }
    if (duel.player2.id !== userId) {
      return res.status(403).json({ message: "Only the challenged player can decline this duel" });
    }

    duel.status = "declined";
    duelStore.set(duelId, duel);

    res.status(200).json({ message: "Duel declined" });
  } catch (error: any) {
    console.error("Decline duel error:", error);
    res.status(500).json({ message: error.message });
  }
});

// POST /api/duel/:duelId/finish
router.post("/:duelId/finish", requireAuth, async (req: Request, res: Response) => {
  try {
    const duelId = req.params.duelId as string;
    const { winnerId } = req.body as { winnerId?: string };
    const userId = req.user?.sub;

    const duel = duelStore.get(duelId);
    if (!duel) {
      return res.status(404).json({ message: "Duel not found" });
    }
    if (duel.status !== "in_progress") {
      return res.status(400).json({ message: "Duel is not in progress" });
    }
    if (duel.player1.id !== userId && duel.player2.id !== userId) {
      return res.status(403).json({ message: "Not a participant in this duel" });
    }
    if (winnerId !== duel.player1.id && winnerId !== duel.player2.id) {
      return res.status(400).json({ message: "Winner must be one of the two duel participants" });
    }

    duel.status = "completed";
    duel.winner = winnerId;
    duelStore.set(duelId, duel);

    res.status(200).json({
      duel: {
        id: duel.id,
        status: duel.status,
        winner: duel.winner,
      },
    });
  } catch (error: any) {
    console.error("Finish duel error:", error);
    res.status(500).json({ message: error.message });
  }
});

export default router;
