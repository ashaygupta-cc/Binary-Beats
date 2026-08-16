/**
 * Low-level compile/run primitives for the local judge. This backend runs on
 * the user's own machine and executes the user's own code — the same trust
 * level as them running it in a terminal. Timeouts, temp dirs, and
 * argument-vector exec (never a shell) are for robustness, not sandboxing.
 */
import { execFile, spawn } from "node:child_process";
import { closeSync, mkdtempSync, openSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import { readFile, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

const COMPILE_TIMEOUT_MS = 20_000;
const OUTPUT_CAP_BYTES = 64 * 1024 * 1024;
export const TIME_LIMIT_MULTIPLIER = 2;

let prlimitAvailable: boolean | null = null;

async function hasPrlimit(): Promise<boolean> {
  if (prlimitAvailable !== null) return prlimitAvailable;
  try {
    await execFileAsync("prlimit", ["--version"], { timeout: 3000 });
    prlimitAvailable = true;
  } catch {
    prlimitAvailable = false;
    console.log("[judge] prlimit not available — memory limits unenforced (MLE will surface as RE)");
  }
  return prlimitAvailable;
}

export interface CompileOk {
  ok: true;
  dir: string;
  binPath: string;
}
export interface CompileFail {
  ok: false;
  compileError: string;
}

export async function compile(code: string): Promise<CompileOk | CompileFail> {
  let finalCode = code;
  if (code.includes("class Solution") && !code.includes("main(")) {
    finalCode = `${code}\n\n// Auto-generated main driver for LeetCode testing\nint main() {\n    ios_base::sync_with_stdio(false);\n    cin.tie(NULL);\n    string s;\n    while (cin >> s) {\n        cout << s << "\\n";\n    }\n    return 0;\n}\n`;
  }

  const dir = mkdtempSync(path.join(os.tmpdir(), "bb-judge-"));
  const srcPath = path.join(dir, "main.cpp");
  const binPath = path.join(dir, "main");
  await writeFile(srcPath, finalCode, "utf8");

  try {
    await execFileAsync("g++", ["-O2", "-pipe", "-std=gnu++17", "-o", binPath, srcPath], {
      timeout: COMPILE_TIMEOUT_MS,
      maxBuffer: 1 << 20,
    });
    return { ok: true, dir, binPath };
  } catch (e) {
    cleanup(dir);
    const err = e as { stderr?: string; killed?: boolean };
    const message = err.killed ? "Compilation timed out (20s)." : (err.stderr ?? "Compilation failed.");
    return { ok: false, compileError: message.slice(0, 64 * 1024) };
  }
}

export interface RunOutcome {
  outcome: "ok" | "tle" | "re";
  timeMs: number;
  exitCode: number | null;
  stdoutPath: string;
  stderrSnippet: string;
  /** Peak resident set size, in KB. Undefined off Linux (no /proc). */
  peakMemoryKb?: number;
}

/**
 * Polls /proc/<pid>/status for VmHWM (peak RSS) while a child runs. Safe to
 * use with `prlimit -- binPath`: prlimit execve's into the target, keeping
 * the PID but resetting VmHWM to reflect only the target binary's growth
 * (verified empirically — prlimit's own footprint never pollutes the read).
 */
function trackPeakRssKb(pid: number, intervalMs = 25): { stop(): number | undefined } {
  if (process.platform !== "linux") return { stop: () => undefined };
  let peakKb = 0;
  const sample = () => {
    try {
      const status = readFileSync(`/proc/${pid}/status`, "utf8");
      const m = /VmHWM:\s+(\d+)\s+kB/.exec(status);
      if (m) peakKb = Math.max(peakKb, Number(m[1]));
    } catch {
      // process may have already exited between spawn and first sample
    }
  };
  sample();
  const timer = setInterval(sample, intervalMs);
  return {
    stop() {
      clearInterval(timer);
      sample();
      return peakKb > 0 ? peakKb : undefined;
    },
  };
}

export async function runOnInput(
  binPath: string,
  dir: string,
  input: string,
  limits: { timeLimitMs: number; memoryLimitMb: number }
): Promise<RunOutcome> {
  const inPath = path.join(dir, "in.txt");
  const outPath = path.join(dir, "out.txt");
  writeFileSync(inPath, input, "utf8");

  const inFd = openSync(inPath, "r");
  const outFd = openSync(outPath, "w");
  const timeoutMs = Math.round(limits.timeLimitMs * TIME_LIMIT_MULTIPLIER) + 200;

  const usePrlimit = await hasPrlimit();
  const memBytes = limits.memoryLimitMb * 1024 * 1024;
  const cmd = usePrlimit ? "prlimit" : binPath;
  const args: string[] = usePrlimit ? [`--as=${memBytes}`, "--", binPath] : [];

  const started = Date.now();
  // stdin/stdout are wired to file descriptors so multi-MB test data streams
  // through the kernel, never through Node buffers.
  const result = await new Promise<{ exitCode: number | null; timedOut: boolean; stderr: string; peakMemoryKb?: number }>(
    (resolve) => {
      const child = spawn(cmd, args, { stdio: [inFd, outFd, "pipe"] });
      let stderr = "";
      let timedOut = false;
      const memTracker = child.pid ? trackPeakRssKb(child.pid) : null;

      const timer = setTimeout(() => {
        timedOut = true;
        child.kill("SIGKILL");
      }, timeoutMs);

      child.stderr?.on("data", (d: Buffer) => {
        if (stderr.length < 8192) stderr += d.toString("utf8");
      });
      child.on("error", () => {
        clearTimeout(timer);
        resolve({ exitCode: null, timedOut, stderr, peakMemoryKb: memTracker?.stop() });
      });
      child.on("close", (code) => {
        clearTimeout(timer);
        resolve({ exitCode: code, timedOut, stderr, peakMemoryKb: memTracker?.stop() });
      });
    }
  );
  const timeMs = Date.now() - started;

  closeSync(inFd);
  closeSync(outFd);

  if (result.timedOut) {
    return { outcome: "tle", timeMs, exitCode: null, stdoutPath: outPath, stderrSnippet: "", peakMemoryKb: result.peakMemoryKb };
  }
  if (result.exitCode !== 0) {
    return {
      outcome: "re",
      timeMs,
      exitCode: result.exitCode,
      stdoutPath: outPath,
      stderrSnippet: result.stderr.slice(0, 4096),
      peakMemoryKb: result.peakMemoryKb,
    };
  }
  return {
    outcome: "ok",
    timeMs,
    exitCode: 0,
    stdoutPath: outPath,
    stderrSnippet: result.stderr.slice(0, 4096),
    peakMemoryKb: result.peakMemoryKb,
  };
}

/** Whitespace-tolerant token comparison — Codeforces semantics for problems without a special checker. */
export async function compareTokenStreams(actualPath: string, expected: string): Promise<boolean> {
  const size = statSync(actualPath).size;
  if (size > OUTPUT_CAP_BYTES) return false;
  const actual = await readFile(actualPath, "utf8");
  const a = actual.trim().split(/\s+/);
  const b = expected.trim().split(/\s+/);
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) return false;
  }
  return true;
}

export async function readRunOutput(outPath: string, capBytes = 256 * 1024): Promise<string> {
  const size = statSync(outPath).size;
  const content = await readFile(outPath, "utf8");
  return size > capBytes ? content.slice(0, capBytes) + "\n… (output truncated)" : content;
}

export function cleanup(dir: string): void {
  try {
    rmSync(dir, { recursive: true, force: true });
  } catch {
    /* best-effort */
  }
}

/** Removes leftover judge temp dirs older than an hour (e.g. after a crash). */
export function sweepStaleJudgeDirs(): void {
  const tmp = os.tmpdir();
  let entries: string[];
  try {
    entries = readdirSync(tmp);
  } catch {
    return;
  }
  const cutoff = Date.now() - 60 * 60 * 1000;
  for (const entry of entries) {
    if (!entry.startsWith("bb-judge-")) continue;
    const full = path.join(tmp, entry);
    try {
      if (statSync(full).mtimeMs < cutoff) rmSync(full, { recursive: true, force: true });
    } catch {
      /* best-effort */
    }
  }
}
