import React from "react";

type PanelTone = "default" | "code";

interface PanelProps extends React.HTMLAttributes<HTMLDivElement> {
  tone?: PanelTone;
  /** Broadcast/viewfinder corner brackets — see .bracket-frame. */
  bracket?: boolean;
  /** Sticker-shadow hover lift — use for clickable/hoverable panels only. */
  lift?: boolean;
}

const TONE_CLASSES: Record<PanelTone, string> = {
  default: "bg-bb-surface border-bb-line-strong text-bb-ink",
  code: "bg-bb-code-surface border-bb-code-line text-bb-code-text",
};

/** Sharp bordered surface — the one card shape for the whole app, replacing
 *  the old .spec-card/.terminal-panel split (that split existed because
 *  paper and terminal were different registers; there's one dark register
 *  now, so one panel shape covers both, distinguished only by `tone`). */
export const Panel: React.FC<PanelProps> = ({
  tone = "default",
  bracket = false,
  lift = false,
  className = "",
  children,
  ...rest
}) => (
  <div
    className={`border-[1.5px] rounded ${TONE_CLASSES[tone]} ${bracket ? "bracket-frame" : ""} ${lift ? "panel-lift" : ""} ${className}`}
    {...rest}
  >
    {children}
  </div>
);
