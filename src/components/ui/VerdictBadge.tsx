import React from "react";
import { verdictTone, type VerdictStatus } from "../../lib/verdictTone";

interface VerdictBadgeProps {
  status: VerdictStatus;
  /** "sm" — compact inline chip (history rows, tile titles). "lg" — the
   *  big square stamp used in the verdict reveal. */
  size?: "sm" | "lg";
  className?: string;
}

/** Boxed LED-style verdict badge — dot + bracketed status code, backed by
 *  lib/verdictTone.ts's single tone mapping. Replaces the old glow-based
 *  verdict stamp (the card-glow / glow-text classes) with a flat
 *  status-color fill, thick border, and hard sticker shadow instead of blur. */
export const VerdictBadge: React.FC<VerdictBadgeProps> = ({ status, size = "sm", className = "" }) => {
  const { text, bg, border, dot, shadow } = verdictTone(status);

  if (size === "lg") {
    return (
      <span
        className={`inline-flex items-center justify-center w-11 h-11 rounded border-2 font-mono font-black text-sm shrink-0 ${text} ${bg} ${border} ${shadow} ${className}`}
      >
        {status}
      </span>
    );
  }

  return (
    <span
      className={`inline-flex items-center gap-1.5 h-6 px-2 rounded-sm border font-mono text-[10px] font-bold uppercase tracking-wider whitespace-nowrap ${text} ${bg} ${border} ${className}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${dot}`} />[{status}]
    </span>
  );
};
