import "dotenv/config";
import express, { Request, Response, NextFunction } from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import authRouter from "./routes/auth.js";
import cfRouter from "./routes/cf.js";
import blitzRouter from "./routes/blitz.js";
import problemsRouter from "./routes/problems.js";
import judgeRouter from "./routes/judge.js";
import leaderboardRouter from "./routes/leaderboard.js";
import duelRouter from "./routes/duel.js";
import leetcodeRouter from "./routes/leetcode.js";
import discordRouter from "./routes/discord.js";
import botRouter from "./routes/bot.js";
import { startSessionPoller } from "./sessionPoller.js";
import { sweepStaleJudgeDirs } from "./judge/executor.js";

const app = express();
const PORT = process.env.PORT ? Number(process.env.PORT) : 4000;

// Trust proxy headers for secure cookies in prod
app.set("trust proxy", true);

// Configure CORS to reflect request origin with credentials
app.use(
  cors({
    credentials: true,
    origin: (origin, callback) => {
      callback(null, origin || "*");
    },
  })
);

app.use(express.json({ limit: "10mb" }));
app.use(cookieParser());

// Health check
app.get("/api/health", (req: Request, res: Response) => {
  res.json({ ok: true });
});
app.get("/health", (req: Request, res: Response) => {
  res.json({ ok: true });
});

// Routes
// Mounted under both /api/ and the root / path to support both the Vite dev proxy
// and direct backend access (e.g., http://localhost:4000/problems).
app.use("/api/auth", authRouter);
app.use("/auth", authRouter);

app.use("/api/cf", cfRouter);
app.use("/cf", cfRouter);

app.use("/api/blitz", blitzRouter);
app.use("/blitz", blitzRouter);

app.use("/api/problems", problemsRouter);
app.use("/problems", problemsRouter);

app.use("/api/judge", judgeRouter);
app.use("/judge", judgeRouter);

app.use("/api/leaderboard", leaderboardRouter);
app.use("/leaderboard", leaderboardRouter);

app.use("/api/duel", duelRouter);
app.use("/duel", duelRouter);

app.use("/api/leetcode", leetcodeRouter);
app.use("/leetcode", leetcodeRouter);
app.use("/api/discord", discordRouter);
app.use("/discord", discordRouter);

// Read-through proxy to the CP-Bot API (bot stays source of truth)
app.use("/api/bot", botRouter);
app.use("/bot", botRouter);

// Global error handler
app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  console.error("Express global error handler:", err);
  res.status(500).json({ error: "INTERNAL", message: "Unexpected server error." });
});

startSessionPoller();
sweepStaleJudgeDirs();

app.listen(PORT, () => {
  console.log(`Binary Beats API listening on http://localhost:${PORT}`);
});
