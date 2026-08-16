import React, { useState } from "react";
import type { DiscordMessage } from "../../lib/botApi";
import { renderMarkdown } from "../discord/DiscordMessageCard";
import { Panel } from "../ui/Panel";
import { Eyebrow } from "../ui/Eyebrow";

/**
 * RoadmapView — renders the CP/DSA roadmap channel as a structured
 * phase-by-phase progression view instead of raw messages.
 *
 * Detects "PHASE N" headings in message content and groups accordingly.
 * Falls back to a clean document view if no phases are detected.
 */

interface Phase {
  number: number;
  title: string;
  content: string;
  resources: { label: string; url: string }[];
  goals: string[];
}

const PHASE_COLORS = [
  { bg: "bg-bb-success/10", border: "border-l-bb-success", text: "text-bb-success" },
  { bg: "bg-bb-rival/10", border: "border-l-bb-rival", text: "text-bb-rival" },
  { bg: "bg-bb-warning/10", border: "border-l-bb-warning", text: "text-bb-warning" },
  { bg: "bg-bb-yellow/10", border: "border-l-bb-yellow", text: "text-bb-yellow" },
  { bg: "bg-bb-danger/10", border: "border-l-bb-danger", text: "text-bb-danger" },
];

function parsePhases(messages: DiscordMessage[]): Phase[] {
  // Combine all message content in chronological order
  const combined = [...messages]
    .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
    .map((m) => m.content)
    .join("\n\n");

  // Split by phase markers
  const phaseRegex = /■?\s*PHASE\s+(\d+)\s*[:\-—]?\s*(.+?)(?=\n)/gi;
  const phases: Phase[] = [];
  let match: RegExpExecArray | null;
  const markers: { index: number; number: number; title: string }[] = [];

  while ((match = phaseRegex.exec(combined))) {
    markers.push({
      index: match.index,
      number: parseInt(match[1]),
      title: match[2].replace(/\*\*/g, "").trim(),
    });
  }

  if (markers.length === 0) return [];

  for (let i = 0; i < markers.length; i++) {
    const start = markers[i].index;
    const end = i + 1 < markers.length ? markers[i + 1].index : combined.length;
    const content = combined.slice(start, end).trim();

    // Extract resource links
    const resources: { label: string; url: string }[] = [];
    const linkRe = /\[([^\]]+)\]\((https?:\/\/[^)]+)\)/g;
    let lm: RegExpExecArray | null;
    while ((lm = linkRe.exec(content))) {
      resources.push({ label: lm[1], url: lm[2] });
    }
    const bareUrl = /(https?:\/\/\S+)/g;
    while ((lm = bareUrl.exec(content))) {
      if (!resources.some((r) => r.url === lm![1])) {
        try {
          const host = new URL(lm[1]).hostname.replace("www.", "");
          resources.push({ label: host, url: lm[1] });
        } catch { /* skip */ }
      }
    }

    // Extract goals (lines starting with ▢ or checkbox-like)
    const goals = content
      .split("\n")
      .filter((l) => /^[▢☐□✓✔]/.test(l.trim()) || /^\[[\sx]\]/i.test(l.trim()))
      .map((l) => l.replace(/^[▢☐□✓✔\[\]x\s]+/i, "").trim())
      .filter(Boolean);

    phases.push({
      number: markers[i].number,
      title: markers[i].title,
      content,
      resources,
      goals,
    });
  }

  return phases;
}

interface Props {
  messages: DiscordMessage[];
}

export const RoadmapView: React.FC<Props> = ({ messages }) => {
  const phases = parsePhases(messages);
  const [expanded, setExpanded] = useState<number | null>(1);

  // Fallback: if no phases detected, render as document
  if (phases.length === 0) {
    const ordered = [...messages].sort(
      (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    );
    return (
      <div className="mx-auto max-w-3xl">
        {ordered.map((m) => (
          <section
            key={m.message_id}
            className="border-b border-bb-line py-5 last:border-0"
          >
            {m.content && <div className="min-w-0">{renderMarkdown(m.content)}</div>}
          </section>
        ))}
      </div>
    );
  }

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-8">
      {/* Header */}
      <div className="text-center">
        <p className="font-hud text-[11px] uppercase tracking-[0.25em] text-bb-yellow">
          Binary Beats
        </p>
        <h1 className="mt-1 font-display text-2xl font-bold uppercase tracking-tight text-bb-ink sm:text-3xl">
          CP & DSA Roadmap
        </h1>
        <p className="mt-1 text-[13px] text-bb-ink-faint">
          Beginner to contest level — the same path the team followed and still
          follows today
        </p>
      </div>

      {/* Progression bar */}
      <div className="flex items-center gap-1">
        {phases.map((p, i) => {
          const c = PHASE_COLORS[i % PHASE_COLORS.length];
          return (
            <button
              key={p.number}
              onClick={() => setExpanded(expanded === p.number ? null : p.number)}
              className={`flex h-10 flex-1 items-center justify-center rounded border-[1.5px] font-mono text-[11px] font-semibold uppercase tracking-wider transition-all ${
                expanded === p.number
                  ? `${c.bg} border-current ${c.text}`
                  : "border-bb-line bg-bb-surface text-bb-ink-faint hover:border-bb-ink-faint"
              }`}
            >
              P{p.number}
            </button>
          );
        })}
      </div>

      {/* Phase cards */}
      <div className="flex flex-col gap-4">
        {phases.map((phase, i) => {
          const colors = PHASE_COLORS[i % PHASE_COLORS.length];
          const isOpen = expanded === phase.number;

          return (
            <Panel
              key={phase.number}
              className={`border-l-4 overflow-hidden transition-all ${colors.border}`}
            >
              {/* Phase header — always visible */}
              <button
                onClick={() =>
                  setExpanded(isOpen ? null : phase.number)
                }
                className="flex w-full items-center gap-4 p-5 text-left"
              >
                <span
                  className={`flex h-10 w-10 shrink-0 items-center justify-center rounded font-hud text-lg font-bold ${colors.bg} ${colors.text}`}
                >
                  {phase.number}
                </span>
                <div className="min-w-0 flex-1">
                  <span className="font-display text-[15px] font-bold uppercase tracking-tight text-bb-ink sm:text-base">
                    {phase.title}
                  </span>
                  {phase.goals.length > 0 && (
                    <p className="mt-0.5 font-mono text-[11px] text-bb-ink-faint">
                      {phase.goals.length} goal{phase.goals.length > 1 ? "s" : ""}
                    </p>
                  )}
                </div>
                <span className="font-mono text-[14px] text-bb-ink-faint">
                  {isOpen ? "−" : "+"}
                </span>
              </button>

              {/* Expanded content */}
              {isOpen && (
                <div className="border-t border-bb-line px-5 pb-5 pt-4">
                  {/* Rendered markdown body */}
                  <div className="prose-bb">
                    {renderMarkdown(phase.content)}
                  </div>

                  {/* Goals checklist */}
                  {phase.goals.length > 0 && (
                    <div className="mt-4">
                      <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-bb-ink-faint">
                        Goals
                      </span>
                      <div className="mt-2 flex flex-col gap-1.5">
                        {phase.goals.map((g, j) => (
                          <div
                            key={j}
                            className="flex items-start gap-2 text-[13px] text-bb-ink-soft"
                          >
                            <span className={`mt-0.5 ${colors.text}`}>▢</span>
                            <span>{g}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Resources */}
                  {phase.resources.length > 0 && (
                    <div className="mt-4">
                      <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-bb-ink-faint">
                        Resources
                      </span>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {phase.resources.map((r, j) => (
                          <a
                            key={j}
                            href={r.url}
                            target="_blank"
                            rel="noreferrer"
                            className="rounded border-[1px] border-bb-line-strong bg-bb-surface-2 px-2.5 py-1 font-mono text-[11px] text-bb-yellow transition-colors hover:border-bb-yellow"
                          >
                            {r.label}
                          </a>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </Panel>
          );
        })}
      </div>

      {/* Final note */}
      <Panel className="border-l-4 border-l-bb-yellow p-5 text-center">
        <p className="text-[13px] italic leading-relaxed text-bb-ink-soft">
          This is not a generic roadmap. This is exactly what we followed and
          what we still follow today. If you think we're good, you already know
          this path works.
        </p>
        <p className="mt-2 font-mono text-[11px] text-bb-ink-faint">
          — Zodiac Z408 (Ashay) · Team Binary Beats
        </p>
      </Panel>
    </div>
  );
};
