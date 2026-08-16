import React from "react";

type TagTone = "neutral" | "accent" | "success" | "danger" | "warning" | "rival";

interface TagProps extends React.HTMLAttributes<HTMLSpanElement> {
  tone?: TagTone;
  dot?: boolean;
  /** Wrap the label in literal [brackets] — the LED-placard look, reserved
   *  for standalone status chips (verdicts, [LIVE]) rather than dense tag
   *  lists (topics, channels), where it would read as clutter. */
  bracket?: boolean;
}

const TONE_CLASSES: Record<TagTone, string> = {
  neutral: "text-bb-ink-faint border-bb-line-strong",
  accent: "text-bb-yellow border-bb-yellow/40 bg-bb-yellow-fill",
  success: "text-bb-success border-bb-success/40 bg-bb-success/10",
  danger: "text-bb-danger border-bb-danger/40 bg-bb-danger/10",
  warning: "text-bb-warning border-bb-warning/40 bg-bb-warning/10",
  rival: "text-bb-rival border-bb-rival/40 bg-bb-rival/10",
};

/** Boxed `[LABEL]` tag — replaces the old soft `.pill` (full-radius) chip.
 *  True pill radius is kept only for round avatars, not tags/badges. */
export const Tag: React.FC<TagProps> = ({ tone = "neutral", dot = false, bracket = false, className = "", children, ...rest }) => (
  <span
    className={`inline-flex items-center gap-1.5 rounded-sm border px-1.5 py-0.5 font-mono text-[9px] font-bold uppercase tracking-wider whitespace-nowrap ${TONE_CLASSES[tone]} ${className}`}
    {...rest}
  >
    {dot && <span className="w-1.5 h-1.5 rounded-full bg-current shrink-0" />}
    {bracket ? <>[{children}]</> : children}
  </span>
);
