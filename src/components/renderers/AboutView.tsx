import { SocialIcon } from "../ui/SocialIcon";
import React, { useState } from "react";
import { ABOUT, SERVER_RULES, ENFORCEMENT_NOTE, SOCIAL_LINKS } from "../../data/static";
import { DISCORD_INVITE } from "../../data/site";
import { Panel } from "../ui/Panel";
import { Eyebrow } from "../ui/Eyebrow";
import { Button } from "../ui/Button";

const LAYER_ACCENTS: Record<string, string> = {
  LEARN: "border-l-bb-success",
  PRACTICE: "border-l-bb-rival",
  COMPETE: "border-l-bb-yellow",
  TRACK: "border-l-bb-warning",
};

export const AboutView: React.FC = () => {
  const [rulesExpanded, setRulesExpanded] = useState(false);
  const shownRules = rulesExpanded ? SERVER_RULES : SERVER_RULES.slice(0, 4);

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-10">
      {/* ── Hero ─────────────────────────────────────────────── */}
      <section className="flex flex-col items-center gap-3 text-center">
        <p className="font-hud text-[11px] uppercase tracking-[0.25em] text-bb-yellow">
          ＢＩＮＡＲＹ ＢＥＡＴＳ
        </p>
        <h1 className="font-display text-3xl font-bold uppercase tracking-tight text-bb-ink sm:text-4xl">
          {ABOUT.tagline}
        </h1>
        <p className="font-mono text-[12px] italic text-bb-ink-faint">
          {ABOUT.subtitle}
        </p>
        <p className="mt-2 max-w-2xl text-[14px] leading-relaxed text-bb-ink-soft">
          {ABOUT.description}
        </p>
        <div className="mt-3 flex flex-wrap justify-center gap-2">
          <Button
            as="a"
            href={DISCORD_INVITE}
            target="_blank"
            rel="noreferrer"
            variant="primary"
            size="md"
          >
            Join the server
          </Button>
          {SOCIAL_LINKS.filter((l) => l.platform === "linkedin").map((l) => (
            <Button
              key={l.platform}
              as="a"
              href={l.url}
              target="_blank"
              rel="noreferrer"
              variant="outline"
              size="md"
            >
              LinkedIn
            </Button>
          ))}
        </div>
      </section>

      {/* ── What we do ────────────────────────────────────────── */}
      <section>
        <Eyebrow number="01">What Binary Beats is</Eyebrow>
        <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3">
          {ABOUT.highlights.map((h) => (
            <Panel key={h.label} className="flex items-center gap-3 p-4">
              <span className="h-2 w-2 shrink-0 rounded-full bg-bb-yellow" aria-hidden />
              <span className="text-[13px] font-semibold text-bb-ink">
                {h.label}
              </span>
            </Panel>
          ))}
        </div>
      </section>

      {/* ── Ecosystem ─────────────────────────────────────────── */}
      <section>
        <Eyebrow number="02">The Ecosystem</Eyebrow>
        <div className="mt-3 flex flex-col gap-3">
          {ABOUT.ecosystem.map((e) => (
            <Panel
              key={e.layer}
              className={`border-l-4 p-4 ${LAYER_ACCENTS[e.layer] ?? "border-l-bb-yellow"}`}
            >
              <span className="font-hud text-sm font-bold uppercase tracking-wide text-bb-ink">
                {e.layer}
              </span>
              <div className="mt-2 flex flex-wrap gap-2">
                {e.items.map((item) => (
                  <span
                    key={item}
                    className="rounded border-[1px] border-bb-line-strong bg-bb-surface-2 px-2.5 py-1 font-mono text-[11px] text-bb-ink-soft"
                  >
                    {item}
                  </span>
                ))}
              </div>
            </Panel>
          ))}
        </div>
      </section>

      {/* ── Server Rules ──────────────────────────────────────── */}
      <section>
        <Eyebrow number="03">Server Rules</Eyebrow>
        <div className="mt-3 flex flex-col gap-3">
          {shownRules.map((rule) => (
            <Panel key={rule.number} className="p-4">
              <div className="flex items-baseline gap-3">
                <span className="font-hud text-lg font-bold tabular-nums text-bb-yellow">
                  {String(rule.number).padStart(2, "0")}
                </span>
                <span className="font-display text-[15px] font-bold uppercase tracking-tight text-bb-ink">
                  {rule.title}
                </span>
              </div>
              <div className="mt-2 flex flex-col gap-1 pl-9">
                {rule.points.map((p, i) => (
                  <p
                    key={i}
                    className="flex gap-2 text-[13px] leading-relaxed text-bb-ink-soft"
                  >
                    <span className="mt-[3px] shrink-0 text-bb-yellow">▪</span>
                    <span>{p}</span>
                  </p>
                ))}
              </div>
            </Panel>
          ))}
        </div>
        {SERVER_RULES.length > 4 && (
          <button
            onClick={() => setRulesExpanded(!rulesExpanded)}
            className="mt-3 w-full rounded border-[1.5px] border-bb-line-strong bg-bb-surface px-4 py-2.5 font-mono text-[12px] uppercase tracking-[0.12em] text-bb-ink-soft transition-colors hover:border-bb-yellow hover:text-bb-yellow"
          >
            {rulesExpanded
              ? "Show fewer rules"
              : `Show all ${SERVER_RULES.length} rules`}
          </button>
        )}
      </section>

      {/* ── Enforcement ───────────────────────────────────────── */}
      <section>
        <Panel className="border-l-4 border-l-bb-danger p-4">
          <span className="font-display text-[13px] font-bold uppercase tracking-tight text-bb-danger">
            Moderation & Enforcement
          </span>
          <p className="mt-2 text-[13px] leading-relaxed text-bb-ink-soft">
            {ENFORCEMENT_NOTE}
          </p>
        </Panel>
      </section>

      {/* ── Connect ───────────────────────────────────────────── */}
      <section>
        <Eyebrow number="04">Connect</Eyebrow>
        <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
          {SOCIAL_LINKS.map((link) => (
            <a
              key={link.platform}
              href={link.url}
              target="_blank"
              rel="noreferrer"
              className="group"
            >
              <Panel
                lift
                className="flex h-full cursor-pointer items-center gap-4 p-4 transition-colors"
              >
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded border-[1.5px] border-bb-line-strong bg-bb-surface-2 text-bb-yellow transition-colors group-hover:border-bb-yellow group-hover:scale-105">
                  <SocialIcon platform={link.platform} className="w-4 h-4" />
                </span>
                <div className="min-w-0">
                  <span className="font-display text-[14px] font-bold uppercase tracking-tight text-bb-ink">
                    {link.label}
                  </span>
                  {link.description && (
                    <p className="mt-0.5 text-[12px] leading-snug text-bb-ink-faint">
                      {link.description}
                    </p>
                  )}
                </div>
              </Panel>
            </a>
          ))}
        </div>
      </section>
    </div>
  );
};
