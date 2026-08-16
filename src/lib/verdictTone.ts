export type VerdictStatus = "AC" | "WA" | "TLE" | "RE" | "CE";
export type VerdictTone = "success" | "danger" | "warning";
export type TileState = "pass" | "wa" | "tle" | "re" | "pending" | "running";

interface ToneClasses {
  text: string;
  bg: string;
  border: string;
  dot: string;
  shadow: string;
}

const TONE_CLASSES: Record<VerdictTone, ToneClasses> = {
  success: { text: "text-bb-success", bg: "bg-bb-success/10", border: "border-bb-success", dot: "bg-bb-success", shadow: "shadow-sticker-success" },
  danger: { text: "text-bb-danger", bg: "bg-bb-danger/10", border: "border-bb-danger", dot: "bg-bb-danger", shadow: "shadow-sticker-danger" },
  warning: { text: "text-bb-warning", bg: "bg-bb-warning/10", border: "border-bb-warning", dot: "bg-bb-warning", shadow: "" },
};

const STATUS_INFO: Record<VerdictStatus, { tone: VerdictTone; label: string }> = {
  AC: { tone: "success", label: "Accepted" },
  WA: { tone: "danger", label: "Wrong Answer" },
  TLE: { tone: "warning", label: "Time Limit Exceeded" },
  RE: { tone: "danger", label: "Runtime Error" },
  CE: { tone: "danger", label: "Compilation Error" },
};

/** Single source of truth for verdict → color/label mapping — replaces five
 *  independent hardcoded copies of this logic (verdictStyles.ts, TestGrid's
 *  TILE_CLASS, SolveSidebar's tierDot, ProblemCard's tier, and an inline
 *  block in CodeWorkspace). */
export function verdictTone(status: VerdictStatus): ToneClasses & { tone: VerdictTone; label: string } {
  const info = STATUS_INFO[status];
  return { ...info, ...TONE_CLASSES[info.tone] };
}

const TILE_TONE: Record<Exclude<TileState, "pending" | "running">, VerdictTone> = {
  pass: "success",
  wa: "danger",
  tle: "warning",
  re: "danger",
};

const TILE_TITLE: Record<TileState, string> = {
  pass: "Passed",
  wa: "Wrong answer — click to view diff",
  tle: "Time limit exceeded",
  re: "Runtime error",
  pending: "Not run",
  running: "Running…",
};

/** Test-tile states cover a couple of extra in-progress states verdicts
 *  don't (pending/running), so they get their own small mapping — still
 *  routed through the same tone classes above rather than re-declaring
 *  colors a second time. */
export function tileToneClass(state: TileState): string {
  if (state === "pending") return "bg-bb-line-strong";
  if (state === "running") return "bg-bb-yellow animate-pulse-accent";
  return TONE_CLASSES[TILE_TONE[state]].dot;
}

export function tileTitle(state: TileState): string {
  return TILE_TITLE[state];
}
