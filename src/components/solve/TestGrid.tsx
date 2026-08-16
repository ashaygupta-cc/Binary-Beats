import React from "react";
import { motion } from "motion/react";
import type { Verdict } from "../../lib/judgeApi";
import { tileTitle, tileToneClass } from "../../lib/verdictTone";

export type TestTileState = "pass" | "wa" | "tle" | "re" | "pending" | "running";

/** Live progress (no verdict yet) → tile states. Purely derived, no new backend data needed. */
export function tilesFromProgress(progress: { done: number; total: number }): TestTileState[] {
  return Array.from({ length: progress.total }, (_, i) =>
    i < progress.done ? "pass" : i === progress.done ? "running" : "pending"
  );
}

/** Finished verdict → tile states. `executeSubmit` stops at the first failure, so
 *  everything before it passed and everything after it never ran. */
export function tilesFromVerdict(v: Verdict): TestTileState[] {
  if (v.totalCount === 0) return [];
  return Array.from({ length: v.totalCount }, (_, i) => {
    if (i < v.passedCount) return "pass";
    if (v.failedTestIndex !== undefined && i === v.failedTestIndex - 1) {
      return v.status === "WA" ? "wa" : v.status === "TLE" ? "tle" : v.status === "RE" ? "re" : "pending";
    }
    return "pending";
  });
}

interface TestGridProps {
  tiles: TestTileState[];
  /** Index (0-based) of the failing tile, if any — only that tile can open the diff viewer. */
  failedIndex?: number;
  onSelectFailed?: () => void;
  className?: string;
}

export const TestGrid: React.FC<TestGridProps> = ({ tiles, failedIndex, onSelectFailed, className = "" }) => {
  if (tiles.length === 0) return null;
  return (
    <div className={`flex flex-wrap gap-[3px] ${className}`} role="list" aria-label="Test results">
      {tiles.map((state, i) => {
        const clickable = i === failedIndex && state !== "pass" && state !== "pending" && !!onSelectFailed;
        return (
          <motion.button
            key={i}
            type="button"
            role="listitem"
            title={tileTitle(state)}
            disabled={!clickable}
            onClick={clickable ? onSelectFailed : undefined}
            whileHover={clickable ? { scale: 1.25 } : undefined}
            className={`w-2.5 h-2.5 rounded-[2px] ${tileToneClass(state)} ${clickable ? "cursor-pointer ring-1 ring-offset-1 ring-offset-bb-surface ring-current" : "cursor-default"}`}
          />
        );
      })}
    </div>
  );
};
