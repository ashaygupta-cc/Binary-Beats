import React from "react";
import { TEAM, type TeamMember } from "../../data/static";
import { Panel } from "../ui/Panel";
import { Eyebrow } from "../ui/Eyebrow";
import { useBotData } from "../../hooks/useBotData";
import { teamApi } from "../../lib/botApi";

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

      {/* Social icons — LinkedIn always, GitHub only if provided. Icon-only:
          the label used to say "LinkedIn Profile" in text, which read as
          redundant next to a recognizable brand mark. */}
      <div className="mt-auto flex w-full items-center justify-center gap-3">
        <a
          href={member.linkedin}
          target="_blank"
          rel="noreferrer"
          aria-label={`${member.name} on LinkedIn`}
          title="LinkedIn"
          className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-bb-surface-2 text-bb-ink hover:bg-bb-yellow hover:text-bb-ground border border-bb-line-strong hover:border-bb-yellow transition-all duration-200 shadow-sm cursor-pointer"
        >
          <svg viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4" aria-hidden>
            <path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z" />
          </svg>
        </a>
        {member.github && (
          <a
            href={member.github}
            target="_blank"
            rel="noreferrer"
            aria-label={`${member.name} on GitHub`}
            title="GitHub"
            className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-bb-surface-2 text-bb-ink hover:bg-bb-yellow hover:text-bb-ground border border-bb-line-strong hover:border-bb-yellow transition-all duration-200 shadow-sm cursor-pointer"
          >
            <svg viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4" aria-hidden>
              <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.085 8.199-11.386 0-6.627-5.373-12-12-12z" />
            </svg>
          </a>
        )}
      </div>
    </Panel>
  );
};

const ROLE_SLUG_MAP: Record<string, string> = {
  founder: "founder",
  "dev lead": "dev-lead",
  "dev-lead": "dev-lead",
  moderator: "moderator",
  lead: "lead",
};

/** !team stores a free-text role/title; map it to one of the known badge
 *  tones where possible so new members visually fit in, falling back to the
 *  neutral "lead" tone rather than a hard error for anything unrecognized. */
function roleSlugFor(title: string): string {
  return ROLE_SLUG_MAP[title.trim().toLowerCase()] ?? "lead";
}

export const TeamView: React.FC = () => {
  // !team-added members, merged in alongside the hand-curated static roster.
  // Someone with the same name in both lists is treated as one person — the
  // DB entry (the live, admin-editable one) wins.
  const remote = useBotData(() => teamApi.list(), []);

  const merged: TeamMember[] = React.useMemo(() => {
    const remoteMembers = remote.data?.members ?? [];
    const remoteNames = new Set(remoteMembers.map((m) => m.name.trim().toLowerCase()));
    const staticSurvivors = TEAM.filter((m) => !remoteNames.has(m.name.trim().toLowerCase()));

    const fromRemote: TeamMember[] = remoteMembers.map((m) => ({
      name: m.name,
      discordId: `team-${m.id}`,
      role: roleSlugFor(m.role),
      title: m.role,
      linkedin: m.linkedin_url,
      github: m.github_url ?? undefined,
    }));

    return [...staticSurvivors, ...fromRemote];
  }, [remote.data]);

  const founder = merged.find((m) => m.isFounder) ?? merged[0];
  const rest = merged.filter((m) => m !== founder);

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
