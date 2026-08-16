import React, { useState } from "react";
import {
  ARENA_SECTIONS,
  ARENA_COMMANDS,
  ARENA_VIDEO_URL,
} from "../../data/static";
import { Panel } from "../ui/Panel";
import { Eyebrow } from "../ui/Eyebrow";
import { Tag } from "../ui/Tag";

const CHANNEL_MAP = [
  { mode: "CP", platform: "Codeforces", duel: "cp-duels", blitz: "cp-blitz" },
  { mode: "DSA", platform: "LeetCode", duel: "dsa-duels", blitz: "dsa-blitz" },
  { mode: "ICPC", platform: "Codeforces", duel: "icpc-duels", blitz: "icpc-blitz" },
];

const TIERS = [
  { name: "Newbie", min: 800, color: "#808080" },
  { name: "Pupil", min: 1000, color: "#00C853" },
  { name: "Specialist", min: 1200, color: "#00BFA5" },
  { name: "Expert", min: 1400, color: "#2979FF" },
  { name: "Candidate Master", min: 1600, color: "#AA00FF" },
  { name: "Master", min: 1900, color: "#FF6D00" },
  { name: "Grandmaster", min: 2200, color: "#D50000" },
  { name: "Legendary Grandmaster", min: 3000, color: "#FFD400" },
];

export const ArenaGuideView: React.FC = () => {
  const [activeSection, setActiveSection] = useState<string | null>(null);

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-10">
      {/* ── Intro ───────────────────────────────────────────── */}
      <section className="text-center">
        <p className="font-hud text-[11px] uppercase tracking-[0.25em] text-bb-yellow">
          1v1 Arena
        </p>
        <h1 className="mt-1 font-display text-3xl font-bold uppercase tracking-tight text-bb-ink sm:text-4xl">
          Duels & Blitz
        </h1>
        <p className="mt-2 text-[14px] leading-relaxed text-bb-ink-soft">
          Challenge members, compete in rated matches, climb leaderboards, and
          sharpen your problem-solving skills in real-time.
        </p>
      </section>

      {/* ── Video ───────────────────────────────────────────── */}
      <section>
        <Eyebrow number="01">How it works</Eyebrow>
        <Panel className="mt-3 overflow-hidden p-0">
          <div className="relative aspect-video w-full bg-bb-ground">
            <iframe
              src={ARENA_VIDEO_URL}
              title="Binary Beats Arena Guide"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              className="absolute inset-0 h-full w-full"
              loading="lazy"
            />
          </div>
        </Panel>
      </section>

      {/* ── Match Channels ──────────────────────────────────── */}
      <section>
        <Eyebrow number="02">Match Channels</Eyebrow>
        <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
          {CHANNEL_MAP.map((c) => (
            <Panel key={c.mode} className="p-4">
              <span className="font-display text-[15px] font-bold uppercase tracking-tight text-bb-ink">
                {c.mode}
              </span>
              <p className="mt-0.5 font-mono text-[11px] text-bb-ink-faint">
                {c.platform}
              </p>
              <div className="mt-3 flex flex-col gap-1.5">
                <span className="flex items-center gap-2 font-mono text-[12px] text-bb-ink-soft">
                  <span className="text-bb-yellow">#</span> {c.duel}
                </span>
                <span className="flex items-center gap-2 font-mono text-[12px] text-bb-ink-soft">
                  <span className="text-bb-yellow">#</span> {c.blitz}
                </span>
              </div>
            </Panel>
          ))}
        </div>
      </section>

      {/* ── Modes & Rules ───────────────────────────────────── */}
      <section>
        <Eyebrow number="03">Modes & Rules</Eyebrow>
        <div className="mt-3 flex flex-col gap-3">
          {ARENA_SECTIONS.map((s) => {
            const isOpen = activeSection === s.id;
            return (
              <Panel
                key={s.id}
                className="cursor-pointer p-4 transition-colors hover:border-bb-yellow"
                role="button"
                tabIndex={0}
                onClick={() => setActiveSection(isOpen ? null : s.id)}
                onKeyDown={(e) => {
                  if (e.key === "Enter")
                    setActiveSection(isOpen ? null : s.id);
                }}
              >
                <div className="flex items-center justify-between">
                  <span className="font-display text-[14px] font-bold uppercase tracking-tight text-bb-ink">
                    {s.title}
                  </span>
                  <span className="font-mono text-[12px] text-bb-ink-faint">
                    {isOpen ? "−" : "+"}
                  </span>
                </div>
                {isOpen && (
                  <p className="mt-3 text-[13px] leading-relaxed text-bb-ink-soft">
                    {s.content}
                  </p>
                )}
              </Panel>
            );
          })}
        </div>
      </section>

      {/* ── Commands ─────────────────────────────────────────── */}
      <section>
        <Eyebrow number="04">Commands</Eyebrow>
        <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
          {ARENA_COMMANDS.map((c) => (
            <Panel key={c.command} className="flex items-center gap-3 p-3">
              <code className="shrink-0 rounded bg-bb-surface-2 px-2 py-1 font-mono text-[12px] text-bb-yellow">
                {c.command}
              </code>
              <span className="min-w-0 text-[12px] text-bb-ink-soft">
                {c.description}
              </span>
            </Panel>
          ))}
        </div>
      </section>

      {/* ── Rating Tiers ─────────────────────────────────────── */}
      <section>
        <Eyebrow number="05">Rating Tiers</Eyebrow>
        <div className="mt-3 flex flex-col gap-1.5">
          {TIERS.map((t, i) => {
            const width = Math.min(
              100,
              ((t.min - 800) / (3000 - 800)) * 100 + 8
            );
            return (
              <div key={t.name} className="flex items-center gap-3">
                <span className="w-8 text-right font-mono text-[11px] tabular-nums text-bb-ink-faint">
                  {t.min}
                </span>
                <div className="relative h-7 flex-1 overflow-hidden rounded border-[1px] border-bb-line bg-bb-surface">
                  <div
                    className="absolute inset-y-0 left-0 rounded-r opacity-25"
                    style={{ width: `${width}%`, backgroundColor: t.color }}
                  />
                  <span
                    className="relative z-10 flex h-full items-center px-3 font-mono text-[11px] font-semibold uppercase tracking-wider"
                    style={{ color: t.color }}
                  >
                    {t.name}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
};
