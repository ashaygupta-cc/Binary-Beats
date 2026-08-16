import React from "react";
import { TEAM, type TeamMember } from "../../data/static";
import { Panel } from "../ui/Panel";
import { Eyebrow } from "../ui/Eyebrow";

/** Deterministic accent from Discord ID for avatar ring glow. */
const RING_COLORS = [
  "border-bb-yellow shadow-bb-yellow/20",
  "border-cyan-400 shadow-cyan-400/20",
  "border-emerald-400 shadow-emerald-400/20",
  "border-purple-400 shadow-purple-400/20",
  "border-amber-400 shadow-amber-400/20",
];

function ringColor(id: string): string {
  const n = id.split("").reduce((a, c) => a + c.charCodeAt(0), 0);
  return RING_COLORS[n % RING_COLORS.length];
}

function initials(name: string): string {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();
}

const ROLE_TONES: Record<string, string> = {
  founder: "bg-amber-400/15 text-amber-400 border-amber-400/35",
  "dev-lead": "bg-cyan-400/15 text-cyan-400 border-cyan-400/35",
  moderator: "bg-purple-400/15 text-purple-400 border-purple-400/35",
  lead: "bg-emerald-400/15 text-emerald-400 border-emerald-400/35",
};

interface CardProps {
  member: TeamMember;
  large?: boolean;
}

const MemberCard: React.FC<CardProps> = ({ member, large }) => {
  const tone = ROLE_TONES[member.role] ?? ROLE_TONES.lead;
  const avatarSrc = member.avatarUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(member.name)}`;

  return (
    <Panel
      lift
      className={`group flex flex-col items-center gap-4 p-6 sm:p-7 text-center transition-all duration-300 border-bb-line-strong hover:border-bb-yellow/60 hover:shadow-[0_12px_36px_rgba(234,179,8,0.12)] hover:-translate-y-1.5 ${
        large ? "max-w-md mx-auto" : "w-full"
      }`}
    >
      {/* Centered Avatar Image Container */}
      <div className="relative flex items-center justify-center shrink-0">
        <div
          className={`flex items-center justify-center rounded-full border-[3px] bg-bb-surface-2 font-display font-bold uppercase tracking-tight text-bb-ink overflow-hidden shadow-lg transition-transform duration-300 group-hover:scale-105 ${ringColor(
            member.discordId
          )} ${large ? "h-28 w-28 text-3xl" : "h-22 w-22 sm:h-24 sm:w-24 text-xl"}`}
        >
          {avatarSrc ? (
            <img
              src={avatarSrc}
              alt={member.name}
              className="h-full w-full rounded-full object-cover transition-transform duration-300 group-hover:scale-110"
              onError={(e) => {
                // Fallback to monogram if image fails to load
                (e.target as HTMLElement).style.display = "none";
              }}
            />
          ) : (
            <span>{initials(member.name)}</span>
          )}
        </div>
      </div>

      {/* Name & Title */}
      <div className="flex flex-col items-center gap-1.5 w-full">
        <h3
          className={`font-display font-bold uppercase tracking-tight text-bb-ink group-hover:text-bb-yellow transition-colors ${
            large ? "text-xl sm:text-2xl" : "text-base sm:text-lg"
          }`}
        >
          {member.name}
        </h3>

        {/* Role badge */}
        <span
          className={`inline-block rounded-full border-[1px] px-3 py-1 font-mono text-[11px] font-semibold uppercase tracking-[0.14em] ${tone}`}
        >
          {member.title}
        </span>

        {/* Founder subtitle */}
        {member.isFounder && (
          <span className="font-mono text-xs italic text-bb-ink-faint mt-0.5">
            Alias: Zodiac Z408
          </span>
        )}
      </div>

      {/* LinkedIn Action Button */}
      <a
        href={member.linkedin}
        target="_blank"
        rel="noreferrer"
        className="mt-auto w-full inline-flex items-center justify-center gap-2 py-2 px-4 rounded-lg bg-bb-surface-2 hover:bg-bb-yellow text-bb-ink hover:text-bb-ground border border-bb-line-strong hover:border-bb-yellow transition-all duration-200 text-xs font-mono font-bold shadow-sm cursor-pointer"
      >
        <svg
          viewBox="0 0 24 24"
          fill="currentColor"
          className="h-4 w-4 shrink-0"
          aria-hidden
        >
          <path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z" />
        </svg>
        <span>LinkedIn Profile</span>
      </a>
    </Panel>
  );
};

export const TeamView: React.FC = () => {
  const founder = TEAM.find((m) => m.isFounder)!;
  const rest = TEAM.filter((m) => !m.isFounder);

  return (
    <div className="mx-auto flex max-w-6xl flex-col items-center justify-center gap-10 px-4 sm:px-6 py-6 text-center">
      {/* Header */}
      <div className="text-center flex flex-col items-center justify-center gap-2 max-w-2xl mx-auto">
        <p className="font-hud text-xs uppercase tracking-[0.3em] text-bb-yellow">
          ＢＩＮＡＲＹ ＢＥＡＴＳ
        </p>
        <h1 className="font-display text-3xl font-bold uppercase tracking-tight text-bb-ink sm:text-4xl">
          Official Team
        </h1>
        <p className="max-w-xl font-mono text-xs text-bb-ink-soft">
          Architects, competitive programmers, and engineers building the Binary Beats ecosystem.
        </p>
      </div>

      {/* Founder Section */}
      <section className="flex flex-col items-center justify-center gap-3 w-full max-w-xl mx-auto">
        <div className="flex justify-center w-full">
          <Eyebrow number="01">Founder</Eyebrow>
        </div>
        <div className="w-full flex justify-center">
          <MemberCard member={founder} large />
        </div>
      </section>

      {/* Core Team Grid */}
      <section className="flex flex-col items-center justify-center gap-3 w-full">
        <div className="flex justify-center w-full">
          <Eyebrow number="02">Core Team & Leads</Eyebrow>
        </div>
        <div className="flex flex-wrap items-center justify-center gap-6 mt-1 w-full max-w-5xl mx-auto">
          {rest.map((m) => (
            <div key={m.discordId} className="w-full sm:w-[calc(50%-12px)] lg:w-[calc(33.333%-16px)] max-w-sm flex justify-center">
              <MemberCard member={m} />
            </div>
          ))}
        </div>
      </section>

      {/* Footer Tagline */}
      <div className="text-center pt-4 border-t border-bb-line w-full max-w-2xl mx-auto">
        <p className="font-mono text-xs uppercase tracking-[0.2em] text-bb-ink-faint">
          Binary Beats — Code. Compete. Conquer.
        </p>
      </div>
    </div>
  );
};
