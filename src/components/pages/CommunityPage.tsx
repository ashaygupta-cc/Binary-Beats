import React from "react";
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
import { NoticeBoard } from "../renderers/NoticeBoard";

interface Props { playSound?: (t: "click" | "hover") => void }

/* ── Analytics card ──────────────────────────────────────────── */
const AnalyticsCard: React.FC<{
  value: number | string | undefined;
  label: string;
  sub?: string;
  accent?: boolean;
}> = ({ value, label, sub, accent }) => (
  <Panel className="flex flex-col items-center justify-center gap-1 p-4 text-center">
    <span className={`font-hud text-[clamp(1.4rem,4vw,2rem)] font-bold leading-none tabular-nums ${
      accent ? "text-bb-yellow" : "text-bb-ink"
    }`}>
      {value === undefined ? "—" : value}
    </span>
    <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-bb-ink-faint">
      {label}
    </span>
    {sub && (
      <span className="font-mono text-[9px] text-bb-ink-faint/60">{sub}</span>
    )}
  </Panel>
);

function relative(iso: string | null): string {
  if (!iso) return "";
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function formatDisplayName(name: string | null | undefined): string {
  if (!name) return "—";
  if (/^\d+$/.test(name.trim())) {
    return `User #${name.slice(-4)}`;
  }
  return name;
}

export const CommunityPage: React.FC<Props> = ({ playSound }) => {
  const stats = useBotData(() => botApi.stats(), []);
  const serverUpdates = useBotData(() => discordApi.messages("server_updates", { limit: 10 }), []);
  const officialUpdates = useBotData(() => discordApi.messages("updates_official", { limit: 10 }), []);
  const live = useBotData(() => botApi.liveDuels(), [], { pollMs: 20_000 });
  const hall = useBotData(() => botApi.pointsBoard("all", 5), []);
  const guild = useBotData(() => discordApi.guild(), []);

  const allUpdates = [
    ...(serverUpdates.data?.messages ?? []),
    ...(officialUpdates.data?.messages ?? []),
  ];

  // Split updates for the two-column layout
  const noticeMessages = allUpdates
    .filter(m => m.channel_key === "updates_official")
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 5);
  const recentMessages = allUpdates
    .filter(m => m.channel_key === "server_updates")
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 5);

  return (
    <div className="flex flex-1 flex-col">
      <PageHeader
        number="04"
        title="Community"
        blurb="Discord is the hub. This is the scoreboard hanging on the wall."
        aside={
          <Button
            as="a" href={DISCORD_INVITE} target="_blank" rel="noreferrer"
            variant="primary" size="md" className="w-full sm:w-auto"
            onMouseEnter={() => playSound?.("hover")}
          >
            Join the server
          </Button>
        }
      />

      <PageBody className="flex flex-col gap-8">
        {/* ── Analytics Grid ───────────────────────────────── */}
        <section>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <AnalyticsCard
              value={guild.data?.member_count ?? stats.data?.members}
              label="Members"
              sub="Discord server"
              accent
            />
            <AnalyticsCard
              value={TEAM.length}
              label="Team Members"
              sub="currently active"
            />
            <AnalyticsCard
              value={274}
              label="LinkedIn Followers"
              sub="official community"
            />
            <AnalyticsCard
              value={2}
              label="Contests Organised"
              sub="official contests"
              accent
            />
          </div>
        </section>

        {/* ── Live duels (if any) ──────────────────────────── */}
        {(live.data?.live.length ?? 0) > 0 && (
          <section>
            <div className="flex items-center gap-2">
              <Eyebrow>Happening now</Eyebrow>
              <span className="inline-block h-2 w-2 rounded-full bg-bb-rival live-pulse" aria-hidden />
            </div>
            <ul className="mt-3 grid grid-cols-1 gap-3 lg:grid-cols-2">
              {live.data!.live.map((m) => (
                <li key={m.id}>
                  <Panel className="flex flex-wrap items-center gap-x-3 gap-y-2 p-4">
                    <Tag tone="neutral" bracket>{m.mode}</Tag>
                    <span className="min-w-0 flex-1 truncate text-[14px] font-semibold text-bb-ink">
                      {formatDisplayName(m.player1_name)} <span className="text-bb-ink-faint">vs</span>{" "}
                      {m.is_bot_match ? "Bot" : formatDisplayName(m.player2_name)}
                    </span>
                    <span className="font-mono text-[11px] tabular-nums text-bb-ink-soft">
                      game {m.current_game}/{m.total_games}
                    </span>
                  </Panel>
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* ── Two-column: Notice Board + Recent Updates ────── */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* Left — Notice Board (official announcements) */}
          <section>
            <Eyebrow>Notice Board</Eyebrow>
            <div className="mt-3">
              {noticeMessages.length > 0 ? (
                <NoticeBoard messages={noticeMessages} limit={4} />
              ) : (
                <Panel className="p-6 text-center">
                  <p className="text-[13px] text-bb-ink-faint">No announcements yet.</p>
                </Panel>
              )}
            </div>
          </section>

          {/* Right — Recent Updates (server updates) */}
          <section>
            <Eyebrow>Recent Updates</Eyebrow>
            <div className="mt-3">
              {recentMessages.length > 0 ? (
                <NoticeBoard messages={recentMessages} limit={4} />
              ) : (
                <Panel className="p-6 text-center">
                  <p className="text-[13px] text-bb-ink-faint">No updates yet.</p>
                </Panel>
              )}
            </div>
          </section>
        </div>

        {/* ── Hall of fame ─────────────────────────────────── */}
        <section>
          <Eyebrow>Hall of fame</Eyebrow>
          <div className="mt-3">
            <DataState
              state={hall.state} error={hall.error} data={hall.data} onRetry={hall.reload}
              skeleton={<SkeletonRows rows={5} height="h-12" />}
              isEmpty={(d) => d.entries.length === 0}
              empty={<EmptyState title="Nobody on the board yet" />}
            >
              {(d) => (
                <ul className="flex flex-col gap-2">
                  {d.entries.map((e) => (
                    <li key={e.discord_id}>
                      <Panel lift role="button" tabIndex={0}
                        onClick={() => navigate(`u/${e.discord_id}`)}
                        onKeyDown={(ev) => { if (ev.key === "Enter") navigate(`u/${e.discord_id}`); }}
                        className="flex cursor-pointer items-center gap-3 p-3"
                      >
                        <span className="font-hud text-xl font-bold tabular-nums text-bb-yellow">
                          {String(e.rank).padStart(2, "0")}
                        </span>
                        <span className="min-w-0 flex-1 truncate text-[14px] font-semibold text-bb-ink">
                          {e.discord_username}
                        </span>
                        <span className="font-hud text-sm tabular-nums text-bb-ink-soft">{e.points}</span>
                      </Panel>
                    </li>
                  ))}
                </ul>
              )}
            </DataState>
          </div>
        </section>
      </PageBody>
    </div>
  );
};
