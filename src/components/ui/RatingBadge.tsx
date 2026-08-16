import React from "react";

// Mirrors Codeforces' own rating-color convention — kept as a deliberate
// exception to the one-accent design system: color here is domain vocabulary
// any Codeforces user reads instantly. Unchanged from the previous system,
// see DESIGN.md.
export function colorForRating(rating: number): string {
  if (rating < 1200) return "#8C8371";
  if (rating < 1400) return "#3FA34D";
  if (rating < 1600) return "#1AA6A0";
  if (rating < 1900) return "#2A5FE0";
  if (rating < 2100) return "#8B3FD6";
  if (rating < 2400) return "#E0821A";
  return "#D6331E";
}

// Same seven bands as colorForRating, named the way Codeforces names them.
export function tierForRating(rating: number): string {
  if (rating < 1200) return "Newbie";
  if (rating < 1400) return "Pupil";
  if (rating < 1600) return "Specialist";
  if (rating < 1900) return "Expert";
  if (rating < 2100) return "Candidate Master";
  if (rating < 2400) return "Master";
  return "Grandmaster";
}

// Product-specific Easy/Medium/Hard framing (distinct from the CF tier
// names above) — used by problem lists/cards. Deliberately reuses
// colorForRating for its color instead of a separate lime/blue/red ramp, so
// difficulty color can never collide with a verdict/status color (a "Hard"
// tag and a WA verdict used to both read as red).
export function difficultyLabel(rating: number): "Easy" | "Medium" | "Hard" {
  if (rating <= 1300) return "Easy";
  if (rating <= 1900) return "Medium";
  return "Hard";
}

interface RatingBadgeProps {
  rating: number | null | undefined;
  className?: string;
}

export const RatingBadge: React.FC<RatingBadgeProps> = ({ rating, className = "" }) => {
  if (rating == null) {
    return (
      <span className={`inline-flex items-center gap-1.5 text-[10px] font-mono font-bold uppercase tracking-wider text-bb-ink-faint ${className}`}>
        <span className="w-1.5 h-1.5 rounded-full bg-current opacity-50" />
        Unrated
      </span>
    );
  }

  const color = colorForRating(rating);

  return (
    <span
      className={`inline-flex items-center gap-1.5 text-[10px] font-mono font-bold tabular-nums ${className}`}
      style={{ color }}
    >
      <span className="w-1.5 h-1.5 rounded-full" style={{ background: color }} />
      {rating}
    </span>
  );
};
