import { Router, Request, Response } from "express";
import { problemKey } from "../codeforces.js";
import { getStatement, getTest, isJudgeable } from "../problemDb.js";
import { getSession } from "../sessionStore.js";
import { scheduleRun } from "../judge/judge.js";
import { createRun, getRun, JudgeBusyError, sweepFinishedRuns, type RunKind } from "../judge/runStore.js";

const router = Router();

const MAX_CODE_BYTES = 256 * 1024;
const MAX_STDIN_BYTES = 256 * 1024;

interface CreateRunBody {
  kind?: RunKind;
  code?: string;
  problemKey?: string;
  sessionId?: string;
  handle?: string;
  stdin?: string;
  platform?: string;
}

// POST /api/judge/runs
router.post("/runs", async (req: Request, res: Response) => {
  try {
    sweepFinishedRuns();
    const body = (req.body ?? {}) as CreateRunBody;
    const { kind, code, stdin } = body;
    const platform = typeof body.platform === "string" && body.platform.trim() ? body.platform.trim().toLowerCase() : undefined;

    if ((kind !== "submit" && kind !== "samples" && kind !== "custom") || typeof code !== "string" || code.length === 0) {
      return res.status(400).json({ error: "BAD_REQUEST", message: "kind ('submit'|'samples'|'custom') and code are required." });
    }
    if (Buffer.byteLength(code, "utf8") > MAX_CODE_BYTES) {
      return res.status(400).json({ error: "BAD_REQUEST", message: "Code exceeds the 256 KB limit." });
    }
    if (stdin !== undefined && Buffer.byteLength(stdin, "utf8") > MAX_STDIN_BYTES) {
      return res.status(400).json({ error: "BAD_REQUEST", message: "stdin exceeds the 256 KB limit." });
    }

    let examples: { input: string; output: string }[] | undefined;
    let sessionId: string | undefined;
    let key: string | undefined;
    let handle: string | undefined;

    if (kind === "submit") {
      sessionId = body.sessionId;
      key = body.problemKey?.toUpperCase();
      if (!key) {
        return res.status(400).json({ error: "BAD_REQUEST", message: "problemKey is required for submit." });
      }

      if (sessionId) {
        const session = await getSession(sessionId);
        if (!session) {
          return res.status(404).json({ error: "NOT_FOUND", message: "Session not found (it may have expired)." });
        }
        if (session.status !== "active") {
          return res.status(409).json({ error: "SESSION_FINISHED", message: "This session has already finished." });
        }
        if (!session.problems.some((p) => problemKey(p) === key)) {
          return res.status(404).json({ error: "NOT_FOUND", message: "That problem isn't part of this session." });
        }

        handle = (body.handle ?? session.handles[0]).toLowerCase();
        if (!session.handles.includes(handle)) {
          return res.status(400).json({ error: "BAD_REQUEST", message: "handle isn't part of this session." });
        }
      }

      if (!(await isJudgeable(key, platform))) {
        return res.status(409).json({ error: "NOT_JUDGEABLE", message: "No complete local test suite for this problem — submit on Codeforces instead." });
      }
    }

    if (kind === "samples") {
      key = body.problemKey?.toUpperCase();
      if (!key) {
        return res.status(400).json({ error: "BAD_REQUEST", message: "problemKey is required for samples." });
      }
      const statement = await getStatement(key, platform);
      if (statement && statement.examples && statement.examples.length > 0) {
        examples = statement.examples.slice(0, 2);
      } else {
        const test0 = await getTest(key, 0, platform);
        const test1 = await getTest(key, 1, platform);
        const fallbackExamples: { input: string; output: string }[] = [];
        if (test0) fallbackExamples.push(test0);
        if (test1) fallbackExamples.push(test1);

        if (fallbackExamples.length === 0) {
          return res.status(404).json({ error: "NOT_FOUND", message: "No sample test cases available for this problem." });
        }
        examples = fallbackExamples;
      }
    }

    try {
      const run = createRun({ kind, sessionId, problemKey: key, handle, platform });
      scheduleRun(run, code, stdin, examples);
      res.status(202).json({ runId: run.id });
    } catch (e) {
      if (e instanceof JudgeBusyError) {
        return res.status(429).json({ error: "JUDGE_BUSY", message: e.message });
      }
      throw e;
    }
  } catch (error: any) {
    console.error("Judge run error:", error);
    res.status(500).json({ error: "INTERNAL", message: error.message });
  }
});

// GET /api/judge/runs/:id
router.get("/runs/:id", async (req: Request, res: Response) => {
  try {
    const run = getRun(req.params.id as string);
    if (!run) {
      return res.status(404).json({ error: "NOT_FOUND", message: "Run not found (results are kept for 10 minutes)." });
    }
    res.json({ run });
  } catch (error: any) {
    console.error("Get run error:", error);
    res.status(500).json({ error: "INTERNAL", message: error.message });
  }
});

export default router;
