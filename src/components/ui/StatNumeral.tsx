import React from "react";
import { useCountUp } from "../../hooks/useCountUp";

type StatSize = "sm" | "md" | "lg" | "xl";

interface StatNumeralProps {
  value: number;
  size?: StatSize;
  /** Animate counting up from 0 on mount/value-change — for reveal moments
   *  (session results, XP gain), not for a number that's already sat still
   *  on screen. */
  countUp?: boolean;
  suffix?: string;
  className?: string;
}

const SIZE_CLASSES: Record<StatSize, string> = {
  sm: "text-lg",
  md: "text-2xl",
  lg: "text-4xl",
  xl: "text-6xl",
};

/** Oversized HUD numeral (Orbitron) — ratings, XP, timers, ranks. The
 *  single most visible typographic shift from the old system, which used
 *  JetBrains Mono for this role. */
export const StatNumeral: React.FC<StatNumeralProps> = ({ value, size = "md", countUp = false, suffix, className = "" }) => {
  const animated = useCountUp(countUp ? value : 0, 700);
  const display = countUp ? animated : value;
  return (
    <span className={`stat-num ${SIZE_CLASSES[size]} ${className}`}>
      {display.toLocaleString()}
      {suffix && <span className="text-[0.5em] ml-1 opacity-60 align-middle">{suffix}</span>}
    </span>
  );
};
