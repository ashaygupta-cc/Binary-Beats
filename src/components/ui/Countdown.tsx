import React from "react";

interface CountdownProps {
  /** Elapsed or remaining seconds — this component just formats/displays,
   *  the ticking timer lives in the caller. */
  seconds: number;
  blink?: boolean;
  className?: string;
}

function formatParts(totalSeconds: number): { h: string | null; m: string; s: string } {
  const total = Math.max(0, Math.floor(totalSeconds));
  const hh = Math.floor(total / 3600);
  const mm = Math.floor((total % 3600) / 60);
  const ss = total % 60;
  return {
    h: hh > 0 ? String(hh).padStart(2, "0") : null,
    m: String(mm).padStart(2, "0"),
    s: String(ss).padStart(2, "0"),
  };
}

/** Elapsed/countdown HUD display with blinking colon separators — a new
 *  capability the old SessionTimer didn't have. */
export const Countdown: React.FC<CountdownProps> = ({ seconds, blink = true, className = "" }) => {
  const { h, m, s } = formatParts(seconds);
  const colonClass = blink ? "animate-caret" : "";

  return (
    <span className={`stat-num inline-flex items-baseline tabular-nums ${className}`}>
      {h !== null && (
        <>
          {h}
          <span className={colonClass}>:</span>
        </>
      )}
      {m}
      <span className={colonClass}>:</span>
      {s}
    </span>
  );
};
