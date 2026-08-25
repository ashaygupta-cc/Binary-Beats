import React, { useState } from "react";
import { botApi, discordApi } from "../../lib/botApi";
import { TEAM } from "../../data/static";
import { useBotData } from "../../hooks/useBotData";
import { DISCORD_INVITE } from "../../data/site";
import { navigate } from "../../lib/router";
import { PageHeader, PageBody, DataState, SkeletonRows, EmptyState } from "../ui/PageShell";
import { Panel } from "../ui/Panel";
import { Button } from "../ui/Button";
import { Eyebrow } from "../ui/Eyebrow";
import { Tag } from "../ui/Tag";
import { renderMarkdown } from "../discord/DiscordMessageCard";
import { CommunityView } from "../CommunityView";

interface Props {
  playSound?: (t: "click" | "hover") => void;
  sharedCode?: { problemTitle: string; code: string } | null;
  onClearSharedCode?: () => void;
}

/* ── Analytics Metric Card ───────────────────────────────────── */
const AnalyticsCard: React.FC<{
  value: number | string | undefined;
  label: string;
  sub?: string;
  accent?: boolean;
}> = ({ value, label, sub, accent }) => (
  <Panel className="flex flex-col items-center justify-center gap-1.5 p-5 text-center border-[1.5px] border-bb-line-strong bg-bb-surface/90 hover:border-bb-yellow/80 transition-all shadow-sm">
    <span className={`font-hud text-[clamp(1.6rem,4vw,2.4rem)] font-extrabold leading-none tabular-nums ${
      accent ? "text-bb-yellow drop-shadow-[0_0_12px_rgba(255,212,0,0.3)]" : "text-bb-ink"
    }`}>
      {value === undefined ? "—" : value}
    </span>
    <span className="font-mono text-[10.5px] font-bold uppercase tracking-[0.2em] text-bb-ink">
      {label}
    </span>
    {sub && (
      <span className="font-mono text-[9px] text-bb-ink-faint">{sub}</span>
    )}
  </Panel>
);

function formatDisplayName(name: string | null | undefined): string {
  if (!name) return "—";
  if (/^\d+$/.test(name.trim())) {
    return `User #${name.slice(-4)}`;
  }
  return name;
}

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(iso).toLocaleDateString(undefined, { day: "2-digit", month: "short" });
}

/* ── Forum Policy Rules Definition matching About page structure ── */
const FORUM_POLICIES = [
  {
    number: 1,
    title: "15-Day Rolling Archive",
    points: [
      "All community posts, OA solution writeups, and discussions automatically archive after 15 days.",
      "Ensures zero database bloat and guarantees ultra-fast query execution for active discussions."
    ]
  },
  {
    number: 2,
    title: "Codeforces Net-Rating Voting Model",
    points: [
      "Rate problem solutions and questions using ▲ (+1 Upvote) and ▼ (-1 Downvote).",
      "Net score represents community consensus: Cyber Gold for positive, Red for negative rating."
    ]
  },
  {
    number: 3,
    title: "Threshold Auto-Purge at ≤ -10 Net Score",
    points: [
      "Any post whose net score falls to ≤ -10 is immediately auto-purged from the forum.",
      "The post author automatically receives 1 Warning Strike."
    ]
  },
  {
    number: 4,
    title: "3-Strike Penalty & 24-Hour Cooldown",
    points: [
      "Warning 1 ➔ Warning 2 ➔ Warning 3 locks the author account into a mandatory 24-hour forum cooldown.",
      "Post publishing is completely blocked until the cooldown timer expires."
    ]
  },
  {
    number: 5,
    title: "Strict Character & Media Limits",
    points: [
      "Post Content: Strictly capped at 5 KB (max 5,000 characters) — excess text is hard blocked.",
      "Post Title: Maximum 100 characters.",
      "Diagrams & Attachments: Must strictly remain under 50 KB in size."
    ]
  }
];

export const CommunityPage: React.FC<Props> = ({ playSound, sharedCode = null, onClearSharedCode = () => {} }) => {
  const [newsFilter, setNewsFilter] = useState<"all" | "official" | "updates">("all");
  const [isPolicyModalOpen, setIsPolicyModalOpen] = useState(false);

  const stats = useBotData(() => botApi.stats(), []);
  const serverUpdates = useBotData(() => discordApi.messages("server_updates", { limit: 12 }), []);
  const officialUpdates = useBotData(() => discordApi.messages("updates_official", { limit: 12 }), []);
  const live = useBotData(() => botApi.liveDuels(), [], { pollMs: 20_000 });
  const hall = useBotData(() => botApi.pointsBoard("all", 12), []);
  const guild = useBotData(() => discordApi.guild(), []);

  // Combine official announcements & platform updates into a chronological stream
  const allNews = [
    ...(officialUpdates.data?.messages ?? []).map(m => ({ ...m, type: "official" as const })),
    ...(serverUpdates.data?.messages ?? []).map(m => ({ ...m, type: "update" as const })),
  ].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  // Strict rolling window: Last 12 posts for All News, and Last 6 posts for each specific section
  const filteredNews = (newsFilter === "all" 
    ? allNews.slice(0, 12) 
    : allNews.filter(m => (newsFilter === "official" ? m.type === "official" : m.type === "update")).slice(0, 6));

  return (
    <div className="flex flex-1 flex-col pb-4">
      <PageHeader
        number="04"
        title="Community Hub"
        blurb="The central gathering for competitive programmers: forum discussions, announcements, live duels, and hall of fame."
        aside={
          <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row items-center">
            {/* Forum Policy & Guidelines Modal Trigger */}
            <Button
              variant="outline"
              size="md"
              onClick={() => {
                playSound?.("click");
                setIsPolicyModalOpen(true);
              }}
              className="w-full sm:w-auto flex items-center justify-center gap-2 font-mono text-xs font-bold uppercase border-bb-line-strong hover:border-bb-yellow hover:text-bb-yellow"
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
              </svg>
              Forum Policy &amp; Rules
            </Button>

            <Button
              as="a"
              href={DISCORD_INVITE}
              target="_blank"
              rel="noreferrer"
              variant="primary"
              size="md"
              className="w-full sm:w-auto font-mono text-xs font-extrabold uppercase shadow-sm"
              onMouseEnter={() => playSound?.("hover")}
            >
              Join Discord Server
            </Button>
          </div>
        }
      />

      {/* ── Forum Policy Modal with Top Clearance & Exact About-Page Structure ── */}
      {isPolicyModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/85 backdrop-blur-md p-4 sm:p-8 pt-20 pb-10 overflow-y-auto animate-in fade-in duration-150">
          <div className="w-full max-w-2xl rounded-xl border-[1.5px] border-bb-yellow bg-bb-ground p-6 shadow-2xl flex flex-col gap-5 max-h-[78vh] overflow-y-auto custom-scrollbar my-auto">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-bb-line pb-3">
              <div className="flex items-center gap-2.5">
                <Eyebrow number="04">Forum Guidelines &amp; Policy</Eyebrow>
                <Tag tone="accent">Strictly Enforced</Tag>
              </div>
              <button
                onClick={() => setIsPolicyModalOpen(false)}
                className="text-bb-ink-faint hover:text-bb-yellow transition-colors font-mono font-bold text-sm cursor-pointer p-1"
              >
                ✕
              </button>
            </div>

            {/* Rules Panels matching AboutView */}
            <div className="flex flex-col gap-3">
              {FORUM_POLICIES.map((rule) => (
                <Panel key={rule.number} className="p-4 border-[1.5px] border-bb-line-strong bg-bb-surface">
                  <div className="flex items-baseline gap-3">
                    <span className="font-hud text-lg font-bold tabular-nums text-bb-yellow">
                      {String(rule.number).padStart(2, "0")}
                    </span>
                    <span className="font-display text-[14px] font-bold uppercase tracking-tight text-bb-ink">
                      {rule.title}
                    </span>
                  </div>
                  <div className="mt-2 flex flex-col gap-1.5 pl-8">
                    {rule.points.map((p, i) => (
                      <p
                        key={i}
                        className="flex gap-2 text-[12px] leading-relaxed text-bb-ink-soft font-mono"
                      >
                        <span className="mt-[2px] shrink-0 text-bb-yellow">▪</span>
                        <span>{p}</span>
                      </p>
                    ))}
                  </div>
                </Panel>
              ))}

              {/* Enforcement Danger Panel */}
              <Panel className="border-l-4 border-l-bb-danger p-4 bg-bb-surface">
                <span className="font-display text-[13px] font-bold uppercase tracking-tight text-bb-danger">
                  Automated Enforcement
                </span>
                <p className="mt-1.5 text-[12px] leading-relaxed text-bb-ink-soft font-mono">
                  Violations, spam, or low-effort solutions are downvoted by the community. Reaching 3 strikes triggers an immediate, unappealable 24-hour forum freeze for that user handle.
                </p>
              </Panel>
            </div>

            <Button
              variant="primary"
              size="md"
              onClick={() => setIsPolicyModalOpen(false)}
              className="w-full font-mono text-xs font-bold uppercase mt-2 shadow-sm"
            >
              I Understand &amp; Agree ➔
            </Button>
          </div>
        </div>
      )}

      <PageBody className="flex flex-col gap-7">
        {/* ── 1. Top Row: Stats Metric Cards ─────────────────── */}
        <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <AnalyticsCard
            value={guild.data?.member_count ?? stats.data?.members ?? 357}
            label="Members"
            sub="Discord Community"
            accent
          />
          <AnalyticsCard
            value={TEAM.length}
            label="Team Roster"
            sub="Core Maintainers"
          />
          <AnalyticsCard
            value={stats.data?.solves ?? 505}
            label="Total Submissions"
            sub="Platform Solves"
            accent
          />
          <AnalyticsCard
            value={2}
            label="Contests Organised"
            sub="Official Rounds"
          />
        </section>

        {/* ── 2. Middle Row: Bento 2-Panel Layout ─────────────── */}
        <section className="grid grid-cols-1 gap-5 lg:grid-cols-12 items-start">
          {/* Panel 1: Announcements & Updates (Left - 7 cols) */}
          <div className="lg:col-span-7 flex flex-col gap-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Eyebrow>Announcements &amp; Updates</Eyebrow>
                <Tag tone="accent">{filteredNews.length} Posts</Tag>
              </div>

              {/* Filter pills */}
              <div className="flex rounded border border-bb-line bg-bb-surface p-0.5 font-mono text-[10px]">
                {[
                  { id: "all" as const, label: "All News" },
                  { id: "official" as const, label: "Official Pinned" },
                  { id: "updates" as const, label: "Platform Feed" },
                ].map((f) => (
                  <button
                    key={f.id}
                    onClick={() => { playSound?.("click"); setNewsFilter(f.id); }}
                    className={`px-2.5 py-0.5 rounded font-bold uppercase transition-all cursor-pointer ${
                      newsFilter === f.id
                        ? "bg-bb-yellow text-bb-ground"
                        : "text-bb-ink-soft hover:text-bb-ink"
                    }`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Live Duel Banner (Compact strip when duel is active) */}
            {(live.data?.live.length ?? 0) > 0 && (
              <div className="rounded-xl border-[1.5px] border-bb-yellow bg-bb-yellow/10 p-3 flex items-center justify-between gap-3 shadow-xs">
                <div className="flex items-center gap-2.5 min-w-0">
                  <span className="h-2 w-2 rounded-full bg-bb-yellow live-pulse shrink-0" />
                  <span className="font-mono text-[10.5px] font-extrabold uppercase text-bb-yellow shrink-0">
                    LIVE DUEL:
                  </span>
                  <span className="truncate text-xs font-bold text-bb-ink">
                    {formatDisplayName(live.data!.live[0].player1_name)} vs {live.data!.live[0].is_bot_match ? "Bot" : formatDisplayName(live.data!.live[0].player2_name)}
                  </span>
                </div>
                <Button variant="primary" size="sm" onClick={() => navigate("arena")} className="shrink-0 font-mono text-[10px] font-bold uppercase py-1 px-3">
                  Watch Duel ➔
                </Button>
              </div>
            )}

            {/* Scrollable Rich Discord Formatted News Feed Container */}
            <div className="rounded-xl border-[1.5px] border-bb-line-strong bg-bb-surface p-4 flex flex-col gap-3 min-h-[380px] max-h-[420px] overflow-y-auto custom-scrollbar">
              {filteredNews.length > 0 ? (
                filteredNews.map((msg) => (
                  <Panel
                    key={msg.id}
                    className="flex flex-col gap-2 p-4 border-bb-line-strong hover:border-bb-yellow transition-all"
                  >
                    <div className="flex items-center justify-between gap-2 border-b border-bb-line pb-2">
                      <div className="flex items-center gap-2">
                        <Tag tone={msg.type === "official" ? "accent" : "neutral"} bracket>
                          {msg.type === "official" ? "OFFICIAL" : "SERVER"}
                        </Tag>
                        <span className="font-mono text-[11px] font-bold text-bb-ink">
                          {msg.author_username}
                        </span>
                      </div>
                      <span className="font-mono text-[10px] text-bb-ink-faint">
                        {relativeTime(msg.created_at)}
                      </span>
                    </div>

                    {/* Rich Markdown Parser (Renders Headers, Bold, Code, Embeds cleanly) */}
                    <div className="text-xs text-bb-ink leading-relaxed font-sans">
                      {renderMarkdown(msg.content)}
                    </div>
                  </Panel>
                ))
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
                  <p className="font-mono text-xs text-bb-ink-faint">No posts in this category yet.</p>
                </div>
              )}
            </div>
          </div>

          {/* Panel 2: Hall of Fame Leaderboard (Right - 5 cols) */}
          <div className="lg:col-span-5 flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Eyebrow>Hall of Fame</Eyebrow>
                <Tag tone="neutral">Lifetime Rank</Tag>
              </div>
              <button
                onClick={() => navigate("leaderboards")}
                className="font-mono text-[10px] font-bold uppercase text-bb-yellow hover:underline cursor-pointer"
              >
                Full Leaderboard ➔
              </button>
            </div>

            {/* Scrollable Hall of Fame with #01, #02 Cyber Gold styling */}
            <div className="rounded-xl border-[1.5px] border-bb-line-strong bg-bb-surface p-3 flex flex-col gap-2 min-h-[380px] max-h-[420px] overflow-y-auto custom-scrollbar">
              <DataState
                state={hall.state} error={hall.error} data={hall.data} onRetry={hall.reload}
                skeleton={<SkeletonRows rows={6} height="h-12" />}
                isEmpty={(d) => d.entries.length === 0}
                empty={<EmptyState title="No solvers ranked yet" />}
              >
                {(d) => (
                  <ul className="flex flex-col gap-2">
                    {d.entries.map((e) => (
                      <li key={e.discord_id}>
                        <Panel lift role="button" tabIndex={0}
                          onClick={() => navigate(`u/${e.discord_id}`)}
                          onKeyDown={(ev) => { if (ev.key === "Enter") navigate(`u/${e.discord_id}`); }}
                          className="flex cursor-pointer items-center gap-3 p-3 border-bb-line-strong hover:border-bb-yellow transition-all"
                        >
                          <span className={`font-hud text-xl font-black tabular-nums shrink-0 ${
                            e.rank === 1 ? "text-bb-yellow drop-shadow-[0_0_2px_rgba(254,231,92,0.25)]" :
                            e.rank === 2 ? "text-slate-300" :
                            e.rank === 3 ? "text-amber-500" : "text-bb-ink-faint"
                          }`}>
                            #{String(e.rank).padStart(2, "0")}
                          </span>
                          <div className="min-w-0 flex-1">
                            <h5 className="truncate text-xs font-bold text-bb-ink">
                              {e.discord_username}
                            </h5>
                            <span className="font-mono text-[10px] text-bb-ink-faint">
                              {e.solved} problems solved
                            </span>
                          </div>
                          <div className="text-right shrink-0">
                            <span className="font-hud text-base font-bold text-bb-yellow tabular-nums block leading-tight">
                              {e.points}
                            </span>
                            <span className="font-mono text-[8.5px] uppercase tracking-wider text-bb-ink-faint">
                              PTS
                            </span>
                          </div>
                        </Panel>
                      </li>
                    ))}
                  </ul>
                )}
              </DataState>
            </div>
          </div>
        </section>

        {/* ── 3. Bottom Row: Community Forum & Discussion Feed ── */}
        <section className="mt-4 pt-6 border-t border-bb-line-strong flex flex-col gap-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <Eyebrow>Community Forum &amp; Discussions</Eyebrow>
              <h3 className="font-display text-xl font-bold uppercase tracking-tight text-bb-ink mt-0.5">
                Share Solutions, OA Questions, and Code
              </h3>
            </div>
          </div>

          <div className="-mt-2">
            <CommunityView
              playSound={playSound ?? (() => {})}
              sharedCode={sharedCode}
              onClearSharedCode={onClearSharedCode}
              showHeader={false}
            />
          </div>
        </section>
      </PageBody>
    </div>
  );
};
