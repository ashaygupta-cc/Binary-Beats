/**
 * Judge orchestration: executes queued runs against the Neon problem DB's
 * official test suites and feeds accepted submissions into the session model.
 */
import { getJudgeInfo, getTest } from "../problemDb.js";
import { finishSession, isComplete, recordSolve } from "../blitzSession.js";
import { getSession, saveSession } from "../sessionStore.js";
import {
  cleanup,
  compile,
  compareTokenStreams,
  readRunOutput,
  runOnInput,
} from "./executor.js";
import {
  enqueueExecution,
  updateRun,
  type JudgeRun,
  type SampleResult,
  type Verdict,
} from "./runStore.js";

const SAMPLE_FALLBACK_LIMIT_MS = 5000;
const CUSTOM_LIMIT_MS = 10_000;
const CUSTOM_MEMORY_MB = 512;
/** Cap per-field size when surfacing a failing test's I/O for the WA diff viewer. */
const FAILED_TEST_FIELD_CAP_BYTES = 16 * 1024;

function capText(s: string, capBytes = FAILED_TEST_FIELD_CAP_BYTES): string {
  return Buffer.byteLength(s, "utf8") > capBytes ? s.slice(0, capBytes) + "\n…(truncated)" : s;
}

function toMb(kb: number | undefined): number | undefined {
  return kb === undefined ? undefined : Math.round((kb / 1024) * 10) / 10;
}

export function scheduleRun(run: JudgeRun, code: string, stdin?: string, examples?: { input: string; output: string }[]): void {
  enqueueExecution(async () => {
    switch (run.kind) {
      case "submit":
        await executeSubmit(run.id, run.sessionId, run.problemKey!, run.handle, code, run.platform);
        break;
      case "samples":
        await executeSamples(run.id, run.problemKey!, code, examples ?? [], run.platform);
        break;
      case "custom":
        await executeCustom(run.id, code, stdin ?? "");
        break;
    }
  });
}

/** sessionId/handle are absent for practice-mode submits — those still judge
 *  against the full suite, they just have nothing to record a solve into. */
async function executeSubmit(
  runId: string,
  sessionId: string | undefined,
  key: string,
  handle: string | undefined,
  code: string,
  platform?: string
): Promise<void> {
  const info = await getJudgeInfo(key, platform);
  if (!info) {
    updateRun(runId, {
      state: "done",
      verdict: { status: "RE", passedCount: 0, totalCount: 0, timeMs: 0 },
      compileError: "Problem is no longer judgeable.",
    });
    return;
  }

  updateRun(runId, { state: "compiling" });
  const compiled = await compile(code);
  if (!compiled.ok) {
    updateRun(runId, {
      state: "done",
      compileError: compiled.compileError,
      verdict: { status: "CE", passedCount: 0, totalCount: info.testCount, timeMs: 0 },
    });
    return;
  }

  try {
    updateRun(runId, { state: "running", progress: { done: 0, total: info.testCount } });
    let maxTimeMs = 0;
    let maxMemoryKb = 0;

    for (let i = 0; i < info.testCount; i++) {
      const test = await getTest(key, i, platform);
      if (!test) {
        updateRun(runId, {
          state: "done",
          verdict: {
            status: "RE",
            passedCount: i,
            totalCount: info.testCount,
            timeMs: maxTimeMs,
            peakMemoryMb: toMb(maxMemoryKb || undefined),
            failedTestIndex: i + 1,
          },
        });
        return;
      }

      const result = await runOnInput(compiled.binPath, compiled.dir, test.input, {
        timeLimitMs: info.timeLimitMs,
        memoryLimitMb: info.memoryLimitMb,
      });
      if (result.peakMemoryKb) maxMemoryKb = Math.max(maxMemoryKb, result.peakMemoryKb);

      if (result.outcome !== "ok") {
        updateRun(runId, {
          state: "done",
          verdict: {
            status: result.outcome === "tle" ? "TLE" : "RE",
            passedCount: i,
            totalCount: info.testCount,
            timeMs: maxTimeMs,
            peakMemoryMb: toMb(maxMemoryKb || undefined),
            failedTestIndex: i + 1,
          },
        });
        return;
      }

      const pass = await compareTokenStreams(result.stdoutPath, test.output);
      if (!pass) {
        const actual = await readRunOutput(result.stdoutPath, FAILED_TEST_FIELD_CAP_BYTES);
        updateRun(runId, {
          state: "done",
          verdict: {
            status: "WA",
            passedCount: i,
            totalCount: info.testCount,
            timeMs: maxTimeMs,
            peakMemoryMb: toMb(maxMemoryKb || undefined),
            failedTestIndex: i + 1,
            failedTest: {
              input: capText(test.input),
              expected: capText(test.output),
              actual: capText(actual),
            },
          },
        });
        return;
      }

      maxTimeMs = Math.max(maxTimeMs, result.timeMs);
      updateRun(runId, { progress: { done: i + 1, total: info.testCount } });
    }

    const solveRecorded = sessionId && handle ? await recordLocalSolve(sessionId, handle, key) : false;
    const verdict: Verdict = {
      status: "AC",
      passedCount: info.testCount,
      totalCount: info.testCount,
      timeMs: maxTimeMs,
      peakMemoryMb: toMb(maxMemoryKb || undefined),
      solveRecorded,
    };
    updateRun(runId, { state: "done", verdict });
  } finally {
    cleanup(compiled.dir);
  }
}

/** Mirrors sessionPoller's record→complete→finish flow for a locally-judged AC. */
async function recordLocalSolve(sessionId: string, handle: string, key: string): Promise<boolean> {
  const session = await getSession(sessionId);
  if (!session || session.status !== "active") return false;

  const updated = recordSolve(session, handle, key, Math.floor(Date.now() / 1000), "local");
  if (updated === session) return false;
  await saveSession(updated);

  const finalState = await getSession(sessionId);
  if (finalState && finalState.status === "active" && isComplete(finalState)) {
    await saveSession(finishSession(finalState));
  }
  return true;
}

async function executeSamples(
  runId: string,
  key: string,
  code: string,
  examples: { input: string; output: string }[],
  platform?: string
): Promise<void> {
  updateRun(runId, { state: "compiling" });
  const compiled = await compile(code);
  if (!compiled.ok) {
    updateRun(runId, { state: "done", compileError: compiled.compileError });
    return;
  }

  try {
    updateRun(runId, { state: "running", progress: { done: 0, total: examples.length } });
    const info = await getJudgeInfo(key, platform);
    const timeLimitMs = info?.timeLimitMs ?? SAMPLE_FALLBACK_LIMIT_MS;
    const memoryLimitMb = info?.memoryLimitMb ?? CUSTOM_MEMORY_MB;

    const samples: SampleResult[] = [];
    for (let i = 0; i < examples.length; i++) {
      const ex = examples[i];
      const result = await runOnInput(compiled.binPath, compiled.dir, ex.input, { timeLimitMs, memoryLimitMb });
      const actual = result.outcome === "ok" ? await readRunOutput(result.stdoutPath, 64 * 1024) : "";
      const pass = result.outcome === "ok" && (await compareTokenStreams(result.stdoutPath, ex.output));
      samples.push({
        index: i,
        pass,
        input: ex.input,
        expected: ex.output,
        actual: result.outcome === "tle" ? "(time limit exceeded)" : result.outcome === "re" ? `(runtime error)\n${result.stderrSnippet}` : actual,
        timeMs: result.timeMs,
        peakMemoryMb: toMb(result.peakMemoryKb),
        outcome: result.outcome,
      });
      updateRun(runId, { progress: { done: i + 1, total: examples.length } });
    }
    updateRun(runId, { state: "done", samples });
  } finally {
    cleanup(compiled.dir);
  }
}

async function executeCustom(runId: string, code: string, stdin: string): Promise<void> {
  updateRun(runId, { state: "compiling" });
  const compiled = await compile(code);
  if (!compiled.ok) {
    updateRun(runId, { state: "done", compileError: compiled.compileError });
    return;
  }

  try {
    updateRun(runId, { state: "running" });
    const result = await runOnInput(compiled.binPath, compiled.dir, stdin, {
      timeLimitMs: CUSTOM_LIMIT_MS / 2,
      memoryLimitMb: CUSTOM_MEMORY_MB,
    });
    updateRun(runId, {
      state: "done",
      output: {
        stdout: result.outcome === "ok" || result.outcome === "re" ? await readRunOutput(result.stdoutPath) : "",
        stderr: result.stderrSnippet,
        timeMs: result.timeMs,
        peakMemoryMb: toMb(result.peakMemoryKb),
        exitCode: result.exitCode,
        timedOut: result.outcome === "tle",
      },
    });
  } finally {
    cleanup(compiled.dir);
  }
}
