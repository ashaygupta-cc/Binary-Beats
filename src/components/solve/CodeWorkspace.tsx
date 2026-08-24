import { motion } from "motion/react";
import React, { useEffect, useRef, useState } from "react";
import { flushSync } from "react-dom";
import { useCodeDraft } from "../../hooks/useCodeDraft";
import { useSubmissionHistory } from "../../hooks/useSubmissionHistory";
import { getHighlightedCode } from "../../lib/cppHighlight";
import {
    createRun,
    JudgeApiError,
    pollRun,
    type CustomOutput,
    type SampleResult,
    type Verdict,
} from "../../lib/judgeApi";
import { verdictTone, type VerdictStatus } from "../../lib/verdictTone";
import { DEFAULT_CPP_CODE, runCode } from "../../lib/wandbox";
import { ConfettiBurst } from "../Effects/ConfettiBurst";
import { Button } from "../ui/Button";
import { Eyebrow } from "../ui/Eyebrow";
import { VerdictBadge } from "../ui/VerdictBadge";
import { DiffViewer } from "./DiffViewer";
import { SubmissionHistoryPanel } from "./SubmissionHistoryPanel";
import { TestGrid, tilesFromProgress, tilesFromVerdict } from "./TestGrid";

interface CodeWorkspaceProps {
  problemKey: string;
  title?: string;
  /** Blitz session to record a solve into — omitted in practice mode, where
   *  Submit still judges against the full suite, it just records nothing. */
  sessionId?: string;
  /** Complete official test suite exists server-side — Submit is available. */
  judgeable?: boolean;
  /** Count of hidden tests Submit judges against — purely for messaging. */
  testCount?: number;
  /** Public examples (from the statement) — enables Run. */
  examples?: { input: string; output: string }[];
  playSound?: (type: "click" | "hover") => void;
  /** Called after an in-app AC has been recorded into the session. */
  onAccepted?: () => void;
  onSyncPoints?: () => Promise<{ success: boolean; results: string[]; earned: number }>;
  platform?: string;
  starterCode?: string;
}

type ConsoleTab = "tests" | "custom" | "history";
type Busy = "tests" | "custom" | "submit" | null;

const FONT_SIZE_KEY = "bb_editor_fontsize_v1";
const FONT_SIZE_MIN = 11;
const FONT_SIZE_MAX = 18;
const FONT_SIZE_DEFAULT = 12;
const LINE_HEIGHT_RATIO = 21 / 12;

function getExternalProblemUrl(problemKey: string, platform?: string): string | null {
  const key = problemKey.trim();
  const normalizedPlatform = platform?.toLowerCase();
  if (normalizedPlatform === "leetcode" || normalizedPlatform === "lc" || key.startsWith("LC-")) {
    return `https://leetcode.com/problems/${key.replace(/^LC-/i, "")}/`;
  }
  if (normalizedPlatform === "codechef" || normalizedPlatform === "cc") {
    return `https://www.codechef.com/problems/${key}`;
  }
  if (normalizedPlatform === "atcoder" || normalizedPlatform === "ac") {
    const parts = key.split("_");
    return `https://atcoder.jp/contests/${parts[0]?.toLowerCase() || key.toLowerCase()}/tasks/${key}`;
  }
  if (normalizedPlatform === "codeforces" || normalizedPlatform === "cf" || /^\d+[A-Za-z]\d?$/.test(key)) {
    const match = key.match(/^(\d+)([A-Za-z]\d?)$/);
    return match
      ? `https://codeforces.com/problemset/problem/${match[1]}/${match[2]}`
      : "https://codeforces.com/problemset";
  }
  return null;
}

function readFontSize(): number {
  try {
    const raw = Number(localStorage.getItem(FONT_SIZE_KEY));
    return raw >= FONT_SIZE_MIN && raw <= FONT_SIZE_MAX ? raw : FONT_SIZE_DEFAULT;
  } catch {
    return FONT_SIZE_DEFAULT;
  }
}

const CONSOLE_HEIGHT_KEY = "bb_console_height_v1";
const CONSOLE_HEIGHT_MIN = 120;
const CONSOLE_HEIGHT_MAX = 420;
const CONSOLE_HEIGHT_DEFAULT = 176;

function readConsoleHeight(): number {
  try {
    const raw = Number(localStorage.getItem(CONSOLE_HEIGHT_KEY));
    return raw >= CONSOLE_HEIGHT_MIN && raw <= CONSOLE_HEIGHT_MAX ? raw : CONSOLE_HEIGHT_DEFAULT;
  } catch {
    return CONSOLE_HEIGHT_DEFAULT;
  }
}

/** Indents/outdents every line touched by [selStart, selEnd] by one tab-stop. */
function reindentBlock(code: string, selStart: number, selEnd: number, outdent: boolean) {
  const lineStart = code.lastIndexOf("\n", selStart - 1) + 1;
  let lineEndIdx = code.indexOf("\n", selEnd);
  if (lineEndIdx === -1) lineEndIdx = code.length;

  const before = code.slice(0, lineStart);
  const block = code.slice(lineStart, lineEndIdx);
  const after = code.slice(lineEndIdx);
  const lines = block.split("\n");

  let firstDelta = 0;
  let cumulativeDelta = 0;
  const newLines = lines.map((line, i) => {
    let delta: number;
    let newLine: string;
    if (outdent) {
      const removed = line.match(/^ {1,4}/)?.[0].length ?? 0;
      delta = -removed;
      newLine = line.slice(removed);
    } else {
      delta = 4;
      newLine = "    " + line;
    }
    if (i === 0) firstDelta = delta;
    cumulativeDelta += delta;
    return newLine;
  });

  const newCode = before + newLines.join("\n") + after;
  const newSelStart = Math.max(lineStart, selStart + firstDelta);
  const newSelEnd = Math.max(newSelStart, selEnd + cumulativeDelta);
  return { newCode, newSelStart, newSelEnd };
}

const ConsoleEmptyState: React.FC<{ icon: React.ReactNode; children: React.ReactNode }> = ({ icon, children }) => (
  <div className="h-full flex flex-col items-center justify-center gap-2.5 text-center px-6">
    <div className="w-8 h-8 rounded-sm border border-bb-code-line flex items-center justify-center text-bb-code-text/25 shrink-0">
      {icon}
    </div>
    <span className="text-bb-code-text/40 text-[11px] leading-relaxed max-w-sm">{children}</span>
  </div>
);

const TerminalIcon: React.FC = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 8.25l3 3-3 3m5 0h3.5M3.75 5.25h16.5a1 1 0 011 1v11.5a1 1 0 01-1 1H3.75a1 1 0 01-1-1V6.25a1 1 0 011-1z" />
  </svg>
);

const BeakerIcon: React.FC = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M9.75 3.104v5.714a2.25 2.25 0 01-.659 1.591L4.5 15.001a2.25 2.25 0 00-.659 1.591v2.156A2.25 2.25 0 006.091 21h11.818a2.25 2.25 0 002.25-2.25v-2.156a2.25 2.25 0 00-.659-1.591l-4.591-4.592a2.25 2.25 0 01-.659-1.591V3.104M8.25 3h7.5"
    />
  </svg>
);

const PlayIcon: React.FC<{ className?: string }> = ({ className = "w-3.5 h-3.5" }) => (
  <svg className={className} fill="currentColor" viewBox="0 0 24 24">
    <path d="M5.25 5.653c0-1.427 1.529-2.33 2.779-1.643l11.54 6.347a1.875 1.875 0 010 3.286l-11.54 6.347c-1.25.687-2.779-.217-2.779-1.643V5.653z" />
  </svg>
);

const CheckCircleIcon: React.FC = () => (
  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
    <circle cx="12" cy="12" r="9" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M8.5 12.5l2.25 2.25L15.5 9.5" />
  </svg>
);

const ClipboardIcon: React.FC = () => (
  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5.25H7.5A2.25 2.25 0 005.25 7.5v11.25a2.25 2.25 0 002.25 2.25h9a2.25 2.25 0 002.25-2.25V7.5a2.25 2.25 0 00-2.25-2.25H15M9 5.25a2.25 2.25 0 012.25-2.25h1.5A2.25 2.25 0 0115 5.25M9 5.25a2.25 2.25 0 002.25 2.25h1.5A2.25 2.25 0 0015 5.25" />
  </svg>
);

const DownloadIcon: React.FC = () => (
  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 16.5v2.25A2.25 2.25 0 006 21h12a2.25 2.25 0 002.25-2.25V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
  </svg>
);

const QuestionMarkIcon: React.FC = () => (
  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
    <circle cx="12" cy="12" r="9" />
    <path strokeLinecap="round" d="M9.5 9.25a2.5 2.5 0 014.5 1.5c0 1.5-2.25 1.75-2.25 3.5" />
    <circle cx="12" cy="17" r="0.75" fill="currentColor" stroke="none" />
  </svg>
);

const SHORTCUTS: [string, string][] = [
  ["⌘/Ctrl ⏎", "Run sample tests"],
  ["Tab", "Indent line / selection"],
  ["⇧ Tab", "Outdent line / selection"],
  ["⏎ after {", "Auto-indents new block"],
  ["( [ { \" '", "Auto-close & type-through"],
];

export const CodeWorkspace: React.FC<CodeWorkspaceProps> = ({
  problemKey,
  title,
  sessionId,
  judgeable = false,
  testCount = 0,
  examples = [],
  playSound,
  onAccepted,
  onSyncPoints,
  platform,
  starterCode,
}) => {
  const platformName = platform
    ? platform.toLowerCase() === "codeforces"
      ? "Codeforces"
      : platform.toLowerCase() === "leetcode"
      ? "LeetCode"
      : platform.toLowerCase() === "atcoder"
      ? "AtCoder"
      : platform.toLowerCase() === "codechef"
      ? "CodeChef"
      : platform.charAt(0).toUpperCase() + platform.slice(1).toLowerCase()
    : "Codeforces";

  const { draft, setCode, setStdin } = useCodeDraft(problemKey, platform, title, starterCode);
  const { history, addRecord } = useSubmissionHistory(problemKey);
  const [busy, setBusy] = useState<Busy>(null);
  const [statusLine, setStatusLine] = useState<string | null>(null);
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
  const [consoleTab, setConsoleTab] = useState<ConsoleTab>("tests");
  const [copied, setCopied] = useState(false);
  const [cursor, setCursor] = useState({ line: 1, col: 1 });
  const [scrollTop, setScrollTop] = useState(0);
  const [fontSize, setFontSize] = useState(readFontSize);
  const [consoleHeight, setConsoleHeight] = useState(readConsoleHeight);
  const [resizingConsole, setResizingConsole] = useState(false);
  const [showShortcuts, setShowShortcuts] = useState(false);

  // Tests tab (Run against examples / Submit against the hidden suite).
  const [testsError, setTestsError] = useState<string | null>(null);
  const [samples, setSamples] = useState<SampleResult[] | null>(null);
  const [verdict, setVerdict] = useState<Verdict | null>(null);
  const [showDiff, setShowDiff] = useState(false);
  const [submitCount, setSubmitCount] = useState(0);

  // Custom Input tab — demoted, self-contained secondary tool.
  const [customOut, setCustomOut] = useState<CustomOutput | null>(null);
  const [customError, setCustomError] = useState<string | null>(null);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const highlightRef = useRef<HTMLPreElement>(null);
  const gutterRef = useRef<HTMLDivElement>(null);
  const consoleHeightRef = useRef(consoleHeight);
  consoleHeightRef.current = consoleHeight;

  const lineHeight = Math.round(fontSize * LINE_HEIGHT_RATIO);
  const hasExamples = examples.length > 0 || judgeable || Boolean(platform);
  const externalUrl = getExternalProblemUrl(problemKey, platform);

  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<{ success: boolean; message: string } | null>(null);
  const [verifying, setVerifying] = useState(false);
  const [verifyMsg, setVerifyMsg] = useState<string | null>(null);

  const handleVerifyPortalSubmission = async () => {
    setVerifying(true);
    setVerifyMsg(null);
    const userHandle =
      localStorage.getItem("bb_handle") ||
      localStorage.getItem("cf_handle") ||
      localStorage.getItem("lc_handle") ||
      "ZodiacZ408";
    try {
      const res = await fetch("/api/bot/duels/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ duel_id: sessionId, discord_id: userHandle }),
      });
      const data = await res.json();
      if (data.verified) {
        setVerifyMsg("✅ Portal submission verified!");
        playSound?.("click");
        onAccepted?.();
      } else {
        setVerifyMsg(data.message || "No verified submission found on portal yet.");
      }
    } catch {
      setVerifyMsg("Verification server unreachable.");
    } finally {
      setVerifying(false);
    }
  };

  const handleSync = async () => {
    if (!onSyncPoints) return;
    playSound?.("click");
    setSyncing(true);
    setSyncResult(null);
    try {
      const res = await onSyncPoints();
      if (res.success) {
        const details = res.results.length > 0 ? res.results.join("\n") : "No new solved problems found for today.";
        setSyncResult({
          success: true,
          message: `${details}\n\nPoints Earned: +${res.earned} pts`,
        });
      } else {
        setSyncResult({
          success: false,
          message: "The bot check completed, but could not verify any new solves. Ensure you have submitted and accepted the solution on the platform, and try again.",
        });
      }
      setConsoleTab("tests");
    } catch (err: any) {
      setSyncResult({
        success: false,
        message: err?.message || "Sync request failed. Make sure the bot is running and your platform handles are linked.",
      });
      setConsoleTab("tests");
    } finally {
      setSyncing(false);
    }
  };

  const adjustFontSize = (delta: number) => {
    setFontSize((prev) => {
      const next = Math.min(FONT_SIZE_MAX, Math.max(FONT_SIZE_MIN, prev + delta));
      try {
        localStorage.setItem(FONT_SIZE_KEY, String(next));
      } catch {
        // ignore quota errors
      }
      return next;
    });
  };

  useEffect(() => {
    if (!resizingConsole) return;

    const handleMove = (e: PointerEvent) => {
      // Dragging the handle up (negative dy) grows the console.
      const next = Math.min(CONSOLE_HEIGHT_MAX, Math.max(CONSOLE_HEIGHT_MIN, consoleHeightRef.current - e.movementY));
      consoleHeightRef.current = next;
      setConsoleHeight(next);
    };
    const handleUp = () => {
      setResizingConsole(false);
      try {
        localStorage.setItem(CONSOLE_HEIGHT_KEY, String(consoleHeightRef.current));
      } catch {
        // ignore quota errors
      }
    };

    window.addEventListener("pointermove", handleMove);
    window.addEventListener("pointerup", handleUp, { once: true });
    return () => {
      window.removeEventListener("pointermove", handleMove);
      window.removeEventListener("pointerup", handleUp);
    };
  }, [resizingConsole]);

  const hasUnsavedChanges = history.length > 0 && history[0].code !== draft.code;
  const memoryDisplay = verdict?.peakMemoryMb ?? customOut?.peakMemoryMb;

  const handleScroll = () => {
    if (!textareaRef.current) return;
    const { scrollTop: st, scrollLeft } = textareaRef.current;
    if (gutterRef.current) gutterRef.current.scrollTop = st;
    if (highlightRef.current) {
      highlightRef.current.scrollTop = st;
      highlightRef.current.scrollLeft = scrollLeft;
    }
    setScrollTop(st);
  };

  const updateCursor = () => {
    const el = textareaRef.current;
    if (!el) return;
    const before = el.value.slice(0, el.selectionStart);
    const linesBefore = before.split("\n");
    setCursor({ line: linesBefore.length, col: linesBefore[linesBefore.length - 1].length + 1 });
  };

  const OPEN_TO_CLOSE: Record<string, string> = { "(": ")", "[": "]", "{": "}", '"': '"', "'": "'" };
  const CLOSERS = new Set(Object.values(OPEN_TO_CLOSE));

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    const el = textareaRef.current;
    if (!el) return;

    // Ctrl/Cmd+Enter — run the sample tests without leaving the keyboard.
    if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
      e.preventDefault();
      if (busy === null && hasExamples) void handleRunTests();
      return;
    }

    // Every branch below synthesizes an edit + moves the caret. The textarea
    // is a controlled component (value={draft.code}), so setCode() alone
    // only schedules a re-render — el.value wouldn't reflect the change
    // until React commits it. Reading/writing el.value or el.selectionStart
    // before that commit (e.g. from the very next rapid keystroke, or a
    // requestAnimationFrame callback) races the update and can scramble
    // text. flushSync forces the commit synchronously before we touch the
    // DOM again, so every branch here is safe against back-to-back keys.
    if (e.key === "Tab") {
      e.preventDefault();
      const { selectionStart, selectionEnd, value } = el;
      if (selectionStart === selectionEnd && !e.shiftKey) {
        const newCode = value.slice(0, selectionStart) + "    " + value.slice(selectionEnd);
        const pos = selectionStart + 4;
        flushSync(() => setCode(newCode));
        el.selectionStart = el.selectionEnd = pos;
      } else {
        const { newCode, newSelStart, newSelEnd } = reindentBlock(value, selectionStart, selectionEnd, e.shiftKey);
        flushSync(() => setCode(newCode));
        el.selectionStart = newSelStart;
        el.selectionEnd = newSelEnd;
      }
      updateCursor();
      return;
    }

    if (e.key === "Enter") {
      e.preventDefault();
      const { selectionStart, selectionEnd, value } = el;
      const lineStart = value.lastIndexOf("\n", selectionStart - 1) + 1;
      const currentLine = value.slice(lineStart, selectionStart);
      let indent = currentLine.match(/^\s*/)?.[0] ?? "";
      if (currentLine.trim().endsWith("{")) indent += "    ";
      const insert = "\n" + indent;
      const newCode = value.slice(0, selectionStart) + insert + value.slice(selectionEnd);
      const pos = selectionStart + insert.length;
      flushSync(() => setCode(newCode));
      el.selectionStart = el.selectionEnd = pos;
      updateCursor();
      return;
    }

    // Type-through a closing bracket/quote that's already there instead of
    // inserting a duplicate.
    if (CLOSERS.has(e.key)) {
      const { selectionStart, selectionEnd, value } = el;
      if (selectionStart === selectionEnd && value[selectionStart] === e.key) {
        e.preventDefault();
        el.selectionStart = el.selectionEnd = selectionStart + 1;
        updateCursor();
        return;
      }
    }

    // Auto-pair brackets/quotes — wrap the selection if there is one.
    if (OPEN_TO_CLOSE[e.key]) {
      const { selectionStart, selectionEnd, value } = el;
      const close = OPEN_TO_CLOSE[e.key];
      e.preventDefault();
      if (selectionStart !== selectionEnd) {
        const selected = value.slice(selectionStart, selectionEnd);
        const newCode = value.slice(0, selectionStart) + e.key + selected + close + value.slice(selectionEnd);
        flushSync(() => setCode(newCode));
        el.selectionStart = selectionStart + 1;
        el.selectionEnd = selectionEnd + 1;
      } else {
        const newCode = value.slice(0, selectionStart) + e.key + close + value.slice(selectionEnd);
        const pos = selectionStart + 1;
        flushSync(() => setCode(newCode));
        el.selectionStart = el.selectionEnd = pos;
      }
      updateCursor();
    }
  };

  /** Primary action: compiles and runs against this problem's example tests. */
  const handleRunTests = async () => {
    if (!hasExamples) return;
    setBusy("tests");
    setTestsError(null);
    setSamples(null);
    setProgress(null);
    setConsoleTab("tests");
    setStatusLine("Compiling…");

    try {
      const runId = await createRun({ kind: "samples", code: draft.code, problemKey, platform });
      const run = await pollRun(runId, (r) => {
        if (r.state === "running" && r.progress) {
          setStatusLine(`Test ${Math.min(r.progress.done + 1, r.progress.total)} / ${r.progress.total}…`);
          setProgress(r.progress);
        }
      });
      if (run.compileError) {
        setTestsError(run.compileError);
      } else if (run.samples) {
        setSamples(run.samples);
      }
    } catch (e) {
      setTestsError((e as Error).message);
    } finally {
      setBusy(null);
      setStatusLine(null);
      setProgress(null);
    }
  };

  const handleSubmit = async () => {
    setBusy("submit");
    setTestsError(null);
    setVerdict(null);
    setShowDiff(false);
    setProgress(null);
    setConsoleTab("tests");
    setStatusLine("Compiling…");

    try {
      const runId = await createRun({ kind: "submit", code: draft.code, problemKey, sessionId, platform });
      const run = await pollRun(runId, (r) => {
        if (r.state === "running" && r.progress) {
          setStatusLine(`Running test ${Math.min(r.progress.done + 1, r.progress.total)} / ${r.progress.total}…`);
          setProgress(r.progress);
        }
      });
      if (run.verdict) {
        setVerdict(run.verdict);
        setSubmitCount((c) => c + 1);
        addRecord({
          submittedAtSeconds: Math.floor(Date.now() / 1000),
          status: run.verdict.status,
          passedCount: run.verdict.passedCount,
          totalCount: run.verdict.totalCount,
          timeMs: run.verdict.timeMs,
          peakMemoryMb: run.verdict.peakMemoryMb,
          code: draft.code,
        });
        if (run.verdict.status === "CE" && run.compileError) {
          setTestsError(run.compileError);
        }
        if (run.verdict.status === "AC") {
          playSound?.("click");
          onAccepted?.();
        }
      }
    } catch (e) {
      if (e instanceof JudgeApiError) {
        setTestsError(e.message);
      } else {
        setTestsError("Submitting failed — retry in a moment.");
      }
    } finally {
      setBusy(null);
      setStatusLine(null);
      setProgress(null);
    }
  };

  /** Secondary tool, tucked into its own tab: run against input you type in yourself. */
  const handleRunCustom = async () => {
    setBusy("custom");
    setCustomError(null);
    setCustomOut(null);
    setStatusLine("Compiling…");

    try {
      const runId = await createRun({ kind: "custom", code: draft.code, stdin: draft.stdin });
      const run = await pollRun(runId, (r) => {
        setStatusLine(r.state === "compiling" || r.state === "queued" ? "Compiling…" : "Running…");
      });
      if (run.compileError) setCustomError(run.compileError);
      else if (run.output) setCustomOut(run.output);
    } catch (e) {
      if (e instanceof JudgeApiError && (e.kind === "NETWORK" || e.kind === "JUDGE_BUSY" || e.kind === "API_FAILED")) {
        // Local judge unreachable/busy — fall back to Wandbox so this always works.
        setStatusLine("Running via Wandbox…");
        const r = await runCode(draft.code, draft.stdin);
        if (r.compileError) setCustomError(r.compileError);
        else setCustomOut({ stdout: r.output, stderr: r.stderr, timeMs: 0, exitCode: r.success ? 0 : null, timedOut: false });
      } else {
        setCustomError((e as Error).message);
      }
    } finally {
      setBusy(null);
      setStatusLine(null);
    }
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(draft.code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // clipboard unavailable — no-op
    }
  };

  const handleReset = () => {
    if (busy !== null) return;
    setCode(DEFAULT_CPP_CODE);
  };

  const handleDownload = () => {
    const blob = new Blob([draft.code], { type: "text/x-c++src" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "solution.cpp";
    a.click();
    URL.revokeObjectURL(url);
  };

  const lines = draft.code.split("\n");
  const tone = verdict ? verdictTone(verdict.status as VerdictStatus) : null;

  return (
    <div className="flex-1 flex flex-col gap-3 min-h-0 p-3 bg-bb-code-bg">
      {/* Verdict stamp — keyed by submitCount so the whole thing (badge spring,
          shake, confetti) remounts and replays on every submission, even a
          repeat AC on the same code. */}
      {verdict && tone && (
        <div
          key={submitCount}
          className={`relative overflow-hidden rounded border-2 px-4 py-3.5 flex flex-col gap-2.5 font-mono ${tone.border} ${tone.bg} ${
            verdict.status === "AC" ? "sheen shadow-sticker-success" : "animate-shake shadow-sticker-danger"
          }`}
        >
          {verdict.status === "AC" && <ConfettiBurst burstKey={submitCount} />}
          <div className="flex items-center gap-3.5 flex-wrap relative z-10">
            <motion.div
              initial={{ scale: 0.3, opacity: 0, rotate: -16 }}
              animate={{ scale: 1, opacity: 1, rotate: 0 }}
              transition={{ type: "spring", stiffness: 340, damping: 16 }}
              className="shrink-0"
            >
              <VerdictBadge status={verdict.status as VerdictStatus} size="lg" />
            </motion.div>
            <div className="flex items-center gap-3 flex-wrap">
              <span
                className={`font-black uppercase tracking-wider font-display ${tone.text} ${
                  verdict.status === "AC" ? "text-xl" : "text-base"
                }`}
              >
                {tone.label}
              </span>
              {verdict.status !== "CE" && (
                <span className="text-xs text-bb-code-text/60 stat-num">
                  {verdict.passedCount} / {verdict.totalCount} tests
                  {verdict.failedTestIndex !== undefined && ` · failed on test ${verdict.failedTestIndex}`}
                  {verdict.status === "AC" && ` · ${verdict.timeMs} ms`}
                  {verdict.peakMemoryMb !== undefined && ` · ${verdict.peakMemoryMb} MB`}
                </span>
              )}
              {verdict.status === "WA" && verdict.failedTest && (
                <button
                  onClick={() => setShowDiff((s) => !s)}
                  className={`text-[10px] font-mono uppercase tracking-wider underline underline-offset-2 cursor-pointer ${tone.text} opacity-80 hover:opacity-100 transition-opacity`}
                >
                  {showDiff ? "Hide Diff" : "View Diff"}
                </button>
              )}
            </div>
            {verdict.status === "AC" && verdict.solveRecorded && (
              <span className="ml-auto text-[10px] uppercase tracking-wider text-bb-yellow/80 whitespace-nowrap">solve recorded ✓</span>
            )}
          </div>

          {verdict.totalCount > 0 && (
            <TestGrid
              tiles={tilesFromVerdict(verdict)}
              failedIndex={verdict.failedTestIndex !== undefined ? verdict.failedTestIndex - 1 : undefined}
              onSelectFailed={verdict.failedTest ? () => setShowDiff(true) : undefined}
              className="relative z-10"
            />
          )}

          {showDiff && verdict.failedTest && (
            <DiffViewer expected={verdict.failedTest.expected} actual={verdict.failedTest.actual} className="relative z-10" />
          )}
        </div>
      )}

      {/* Editor + resizable console, grouped so the drag handle can sit between
          them as a plain sibling — putting it inside the console's own
          overflow-hidden box would clip it out of the hit-testable area. */}
      <div className="flex-1 flex flex-col min-h-0">
      <div className="flex-1 min-h-[360px] relative rounded border border-bb-code-line bg-bb-code-surface overflow-hidden flex flex-col font-mono bracket-frame text-bb-code-line">
        <div className="h-8 bg-bb-code-bg/40 border-b border-bb-code-line flex items-center justify-between px-3 select-none">
          <div className="flex items-center gap-2.5 min-w-0">
            <Eyebrow number="02" className="hidden sm:inline-flex shrink-0">Editor</Eyebrow>
            <span className="w-px h-3.5 bg-bb-code-line hidden sm:inline-block shrink-0" />
            <span className="text-[11.5px] font-bold text-bb-code-text shrink-0 flex items-center gap-1.5">
              solution.cpp
              {hasUnsavedChanges && (
                <span className="w-1.5 h-1.5 rounded-full bg-bb-code-acc" title="Changed since your last submission" />
              )}
            </span>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <div className="flex items-center gap-1 text-bb-code-text/50">
              <button
                onClick={() => adjustFontSize(-1)}
                disabled={fontSize <= FONT_SIZE_MIN}
                title="Decrease font size"
                className="w-5 h-5 flex items-center justify-center text-[10px] font-bold hover:text-bb-code-text transition-colors disabled:opacity-25 cursor-pointer"
              >
                A−
              </button>
              <span className="text-[9px] tabular-nums w-6 text-center select-none">{fontSize}px</span>
              <button
                onClick={() => adjustFontSize(1)}
                disabled={fontSize >= FONT_SIZE_MAX}
                title="Increase font size"
                className="w-5 h-5 flex items-center justify-center text-[10px] font-bold hover:text-bb-code-text transition-colors disabled:opacity-25 cursor-pointer"
              >
                A+
              </button>
            </div>
            <button
              onClick={handleReset}
              disabled={busy !== null}
              title="Reset to starter template"
              className="text-bb-code-text/35 hover:text-bb-code-acc transition-colors disabled:opacity-30 cursor-pointer shrink-0"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182m0-4.991v4.99" />
              </svg>
            </button>
          </div>
        </div>

        <div className="flex-1 relative flex overflow-hidden scanlines">
          <div
            ref={gutterRef}
            className="w-11 bg-bb-code-bg border-r border-bb-code-line flex flex-col pt-4 items-end pr-3 text-bb-code-text/35 select-none overflow-hidden font-mono"
            style={{ fontSize }}
          >
            {lines.map((_, idx) => (
              <div
                key={idx}
                className={`w-full flex items-center justify-end font-bold transition-colors ${idx === cursor.line - 1 ? "text-bb-code-acc" : ""}`}
                style={{ height: lineHeight }}
              >
                {idx + 1}
              </div>
            ))}
          </div>

          <div className="flex-1 relative overflow-hidden bg-transparent">
            <div
              aria-hidden="true"
              className="absolute left-0 right-0 bg-bb-code-acc/[0.06] pointer-events-none z-[1]"
              style={{ top: (cursor.line - 1) * lineHeight - scrollTop, height: lineHeight }}
            />
            <pre
              ref={highlightRef}
              className="absolute inset-0 p-4 pt-4 text-bb-code-text overflow-hidden pointer-events-none select-none font-mono whitespace-pre bg-transparent border-0 outline-none z-0"
              style={{ lineHeight: `${lineHeight}px`, fontSize }}
              dangerouslySetInnerHTML={{ __html: getHighlightedCode(draft.code) }}
            />
            <textarea
              ref={textareaRef}
              value={draft.code}
              onChange={(e) => setCode(e.target.value)}
              onScroll={handleScroll}
              onKeyDown={handleKeyDown}
              onKeyUp={updateCursor}
              onClick={updateCursor}
              onSelect={updateCursor}
              className="absolute inset-0 p-4 pt-4 text-transparent caret-bb-code-acc selection:bg-bb-code-acc/20 selection:text-bb-code-text overflow-auto font-mono whitespace-pre bg-transparent border-0 outline-none resize-none focus:ring-0 focus:border-0 w-full h-full z-10 custom-scrollbar-code"
              style={{ lineHeight: `${lineHeight}px`, fontSize }}
              spellCheck={false}
            />
          </div>
        </div>

        <div className="h-6 bg-bb-code-bg border-t border-bb-code-line flex items-center justify-between px-3 text-[10px] font-mono text-bb-code-text/50 select-none">
          <span className="flex items-center gap-1.5 text-bb-code-acc font-bold">
            <span className="w-1.5 h-1.5 rounded-full bg-bb-code-acc" />
            C++17
          </span>
          <span className="tabular-nums">Ln {cursor.line}, Col {cursor.col}</span>
          <span className="flex items-center gap-3 tabular-nums">
            {memoryDisplay !== undefined && <span>{memoryDisplay} MB</span>}
            <span>{lines.length} lines · UTF-8</span>
          </span>
        </div>
      </div>

      {/* Drag handle — a plain flex sibling between editor and console, not a
          child of the console's overflow-hidden box (which would clip it out
          of the hit-testable area entirely). */}
      <div
        onPointerDown={(e) => {
          e.preventDefault();
          setResizingConsole(true);
        }}
        role="separator"
        aria-orientation="horizontal"
        title="Drag to resize console"
        className="h-3 shrink-0 cursor-row-resize flex items-center justify-center group/resize"
      >
        <div
          className={`w-10 h-[3px] rounded-sm transition-colors ${
            resizingConsole ? "bg-bb-yellow" : "bg-bb-code-line group-hover/resize:bg-bb-code-text/40"
          }`}
        />
      </div>

      {/* Console */}
      <div
        className="rounded border border-bb-code-line bg-bb-code-surface overflow-hidden flex flex-col font-mono text-xs shrink-0 bracket-frame text-bb-code-line"
        style={{ height: consoleHeight }}
      >
        <div className="h-8 bg-bb-code-bg/40 border-b border-bb-code-line flex items-center justify-between px-3 select-none">
          <div className="flex gap-5 items-center h-full">
            <Eyebrow number="03" className="hidden md:inline-flex shrink-0">Console</Eyebrow>
            <span className="w-px h-3.5 bg-bb-code-line hidden md:inline-block shrink-0" />
            {(
              [
                { id: "tests" as const, label: "Tests" },
                { id: "custom" as const, label: "Custom Input" },
                { id: "history" as const, label: "History" },
              ]
            ).map((tab) => (
              <button
                key={tab.id}
                onClick={() => setConsoleTab(tab.id)}
                className={`h-full text-[10px] font-mono tracking-wider uppercase cursor-pointer border-b-2 flex items-center transition-all ${
                  consoleTab === tab.id ? "border-bb-code-acc text-bb-code-text" : "border-transparent text-bb-code-text/40 hover:text-bb-code-text/70"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
          {statusLine && (
            <div className="flex items-center gap-2.5">
              {progress ? (
                <TestGrid tiles={tilesFromProgress(progress)} />
              ) : (
                <div className="flex gap-[3px]">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <motion.span
                      key={i}
                      className="w-2.5 h-1.5 rounded-[1px] bg-bb-code-acc"
                      animate={{ opacity: [0.15, 1, 0.15] }}
                      transition={{ duration: 1, repeat: Infinity, delay: i * 0.12 }}
                    />
                  ))}
                </div>
              )}
              <motion.span
                key={statusLine}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-bb-code-acc text-[10px] font-mono"
              >
                <span className="text-bb-code-text/30">$</span> {statusLine}
                <span className="caret-inline text-bb-code-acc" />
              </motion.span>
            </div>
          )}
        </div>

        <div className="flex-1 p-3 overflow-y-auto custom-scrollbar-code bg-bb-code-bg/30">
          {consoleTab === "custom" ? (
            <div className="h-full flex flex-col gap-2">
              <div className="flex items-center justify-between shrink-0">
                <span className="text-[9px] uppercase tracking-wider text-bb-code-text/35">
                  optional — test your program against input you type in
                </span>
                <button
                  onClick={handleRunCustom}
                  disabled={busy !== null}
                  className="h-6 px-2.5 rounded border border-bb-code-line hover:border-bb-code-acc/40 hover:text-bb-code-acc bg-bb-code-bg/60 text-bb-code-text/70 text-[10px] font-mono uppercase tracking-wider transition-colors disabled:opacity-40 cursor-pointer flex items-center gap-1.5 shrink-0"
                >
                  <PlayIcon className="w-2.5 h-2.5" />
                  {busy === "custom" ? "Running…" : "Run"}
                </button>
              </div>
              <textarea
                value={draft.stdin}
                onChange={(e) => setStdin(e.target.value)}
                placeholder="stdin — optional"
                spellCheck={false}
                className="flex-1 min-h-0 bg-bb-code-bg/40 rounded border border-bb-code-line p-2.5 text-bb-code-text placeholder-bb-code-text/30 focus:outline-none focus:border-bb-code-text/25 resize-none"
              />
              {(customError || customOut) && (
                <div className="shrink-0 max-h-24 overflow-y-auto custom-scrollbar-code rounded border border-bb-code-line bg-bb-code-bg/40 p-2.5">
                  {customError ? (
                    <span className="text-bb-danger whitespace-pre-wrap">{customError}</span>
                  ) : (
                    customOut && (
                      <>
                        <span className="text-bb-code-text/90 whitespace-pre-wrap">
                          {customOut.timedOut ? "(time limit exceeded)" : customOut.stdout || "(no output)"}
                        </span>
                        {customOut.stderr && <span className="text-bb-danger whitespace-pre-wrap block mt-2">{customOut.stderr}</span>}
                      </>
                    )
                  )}
                </div>
              )}
            </div>
          ) : consoleTab === "history" ? (
            <SubmissionHistoryPanel
              history={history}
              onRestore={(code) => {
                setCode(code);
                playSound?.("click");
              }}
            />
          ) : syncResult ? (
            <div className={`p-4 rounded border font-sans select-text ${syncResult.success ? "border-bb-success/30 bg-bb-success/[0.04] text-bb-success" : "border-bb-danger/30 bg-bb-danger/[0.04] text-bb-danger"}`}>
              <h4 className="font-mono font-bold uppercase tracking-wider text-xs flex items-center gap-1.5 mb-2.5">
                {syncResult.success ? "✓ Discord Sync Completed" : "✗ Discord Sync Failed"}
              </h4>
              <p className="text-xs font-mono leading-relaxed mb-3.5 whitespace-pre-wrap max-h-48 overflow-y-auto custom-scrollbar-code">{syncResult.message}</p>
              <Button size="sm" variant="outline" onClick={() => setSyncResult(null)} className="h-7 text-[10px] uppercase font-mono tracking-wider">
                Clear Result
              </Button>
            </div>
          ) : testsError ? (
            <span className="text-bb-danger whitespace-pre-wrap">{testsError}</span>
          ) : samples ? (
            <div className="flex flex-col gap-2.5">
              {samples.every((s) => s.pass) && (
                <div className="p-3 rounded border border-emerald-500/30 bg-emerald-500/10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5 text-xs font-sans">
                  <div>
                    <span className="font-bold text-emerald-400 block">✓ All local testcases passed!</span>
                    <span className="text-bb-code-text/70 text-[11px] block mt-0.5">
                      Submit on the official portal ({platformName}) and click verify to register your match solve on CP-Bot!
                    </span>
                    {verifyMsg && <span className="text-[11px] font-mono font-semibold block mt-1 text-bb-yellow">{verifyMsg}</span>}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {externalUrl && (
                      <a
                        href={externalUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="px-3 py-1.5 rounded bg-bb-surface-2 hover:bg-bb-yellow hover:text-bb-ground border border-bb-line text-[10px] font-mono font-bold uppercase tracking-wider transition-colors inline-flex items-center gap-1"
                      >
                        <span>Submit on {platformName}</span>
                        <span>↗</span>
                      </a>
                    )}
                    <Button
                      size="sm"
                      variant="primary"
                      onClick={handleVerifyPortalSubmission}
                      disabled={verifying}
                      className="h-7 text-[10px] uppercase font-mono tracking-wider shrink-0"
                    >
                      {verifying ? "Checking..." : "Verify Portal Submit"}
                    </Button>
                  </div>
                </div>
              )}
              {samples.map((s) => {
                const sampleStatus: VerdictStatus = s.pass ? "AC" : s.outcome === "tle" ? "TLE" : s.outcome === "re" ? "RE" : "WA";
                const sTone = verdictTone(sampleStatus);
                return (
                  <div key={s.index} className="rounded border border-bb-code-line overflow-hidden">
                    <div className={`flex items-center justify-between px-3 py-1.5 text-[10px] uppercase tracking-wider ${sTone.text} ${sTone.bg}`}>
                      <span>
                        Test {s.index + 1} — {s.pass ? "pass ✓" : s.outcome === "tle" ? "time limit" : s.outcome === "re" ? "runtime error" : "fail ✗"}
                      </span>
                      <span className="text-bb-code-text/40 tabular-nums">
                        {s.timeMs} ms{s.peakMemoryMb !== undefined ? ` · ${s.peakMemoryMb} MB` : ""}
                      </span>
                    </div>
                    {!s.pass &&
                      (s.outcome === "ok" ? (
                        <DiffViewer expected={s.expected} actual={s.actual} />
                      ) : (
                        <pre className="p-2.5 text-[11px] text-bb-code-text/90 whitespace-pre-wrap max-h-28 overflow-y-auto custom-scrollbar-code">{s.actual}</pre>
                      ))}
                  </div>
                );
              })}
            </div>
          ) : hasExamples ? (
            <ConsoleEmptyState icon={<BeakerIcon />}>
              Run compiles your code and checks it against this problem's {examples.length} example test{examples.length === 1 ? "" : "s"}.
              <span className="caret-inline text-bb-code-acc" />
            </ConsoleEmptyState>
          ) : (
            <ConsoleEmptyState icon={<TerminalIcon />}>
              {judgeable
                ? "This problem has no example tests to check locally — Submit judges directly against the official hidden suite."
                : `This problem has no example tests, and no local test suite either — verify on ${platformName}.`}
            </ConsoleEmptyState>
          )}
        </div>
      </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2 shrink-0 flex-wrap">
        {judgeable && (
          <Button variant="primary" onClick={handleSubmit} disabled={busy !== null}>
            <CheckCircleIcon />
            {busy === "submit" ? "Judging…" : "Submit"}
          </Button>
        )}
        {onSyncPoints && (
          <Button variant={judgeable ? "outline" : "primary"} onClick={handleSync} disabled={busy !== null || syncing}>
            <CheckCircleIcon />
            {syncing ? "Syncing..." : "Sync Discord Points"}
          </Button>
        )}
        <Button
          variant={judgeable ? "outline" : "primary"}
          onClick={handleRunTests}
          disabled={busy !== null || !hasExamples}
          title={hasExamples ? undefined : "No example tests available for this problem"}
        >
          <PlayIcon />
          {busy === "tests" ? "Running…" : "Run"}
          <span className={`hidden sm:inline text-[9px] font-mono ${judgeable ? "text-bb-code-text/35" : "opacity-50"}`}>⌘⏎</span>
        </Button>
        <Button variant="outline" onClick={handleCopy}>
          <ClipboardIcon />
          {copied ? "Copied ✓" : "Copy"}
        </Button>
        <button
          onClick={handleDownload}
          title="Download solution.cpp"
          className="h-9 w-9 rounded border border-bb-code-line hover:border-bb-code-text/25 bg-bb-code-surface text-bb-code-text/70 hover:text-bb-code-text transition-colors cursor-pointer flex items-center justify-center shrink-0"
        >
          <DownloadIcon />
        </button>

        <div className="relative shrink-0">
          <button
            onClick={() => setShowShortcuts((s) => !s)}
            title="Keyboard shortcuts"
            className={`h-9 w-9 rounded border transition-colors cursor-pointer flex items-center justify-center ${
              showShortcuts
                ? "border-bb-code-acc/40 bg-bb-code-acc/[0.08] text-bb-code-acc"
                : "border-bb-code-line hover:border-bb-code-text/25 bg-bb-code-surface text-bb-code-text/70 hover:text-bb-code-text"
            }`}
          >
            <QuestionMarkIcon />
          </button>
          {showShortcuts && (
            <>
              <div className="fixed inset-0 z-30" onClick={() => setShowShortcuts(false)} />
              <div className="absolute bottom-full right-0 mb-2 w-72 rounded border border-bb-code-line bg-bb-code-surface shadow-2xl shadow-black/40 p-3.5 z-40 bracket-frame text-bb-code-line">
                <Eyebrow className="mb-2.5">Shortcuts</Eyebrow>
                <div className="flex flex-col gap-2">
                  {SHORTCUTS.map(([keys, desc]) => (
                    <div key={desc} className="flex items-center justify-between gap-3">
                      <span className="text-[11px] font-mono text-bb-code-text/55">{desc}</span>
                      <span className="text-[10px] font-mono text-bb-code-text px-1.5 py-0.5 rounded bg-bb-code-bg border border-bb-code-line shrink-0 whitespace-nowrap">
                        {keys}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>

        <span className="text-[9px] font-mono text-bb-code-text/35 ml-auto hidden md:inline">
          {judgeable
            ? `Run checks the examples; Submit judges all ${testCount} official hidden tests, right here.`
            : `Run checks the examples. No local test suite for this problem — submit on ${platformName} for the verdict.`}
        </span>
      </div>
    </div>
  );
};
