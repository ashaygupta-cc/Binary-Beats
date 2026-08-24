import React, { useEffect, useState } from "react";
import { useBotData } from "../../hooks/useBotData";
import { botApi, discordApi, type DiscordAttachment, type DiscordMessage } from "../../lib/botApi";
import { navigate } from "../../lib/router";
import { Button } from "../ui/Button";
import { Eyebrow } from "../ui/Eyebrow";
import { DataState, EmptyState, PageBody, PageHeader, SkeletonRows } from "../ui/PageShell";
import { Panel } from "../ui/Panel";
import { Tag } from "../ui/Tag";

interface Props {
  discordId: string;
  isSelf?: boolean;
  playSound?: (t: "click" | "hover") => void;
}

const Stat: React.FC<{ label: string; value: React.ReactNode }> = ({ label, value }) => (
  <Panel className="p-4">
    <span className="block font-hud text-[clamp(1.25rem,4.5vw,2rem)] font-bold leading-none tabular-nums text-bb-ink">
      {value}
    </span>
    <span className="mt-1.5 block font-mono text-[10px] uppercase tracking-[0.18em] text-bb-ink-faint">
      {label}
    </span>
  </Panel>
);

const SUBMISSION_FILE_RE = /\.(cpp|c|java|py|pdf)$/i;
const MAX_SUBMISSION_BYTES = 10 * 1024;

function submissionAttachments(message: DiscordMessage): DiscordAttachment[] {
  return (message.attachments ?? []).filter(
    (attachment) => attachment.size <= MAX_SUBMISSION_BYTES && SUBMISSION_FILE_RE.test(attachment.filename)
  );
}

export const ProfilePage: React.FC<Props> = ({ discordId, isSelf, playSound }) => {
  const { data, state, error, reload } = useBotData(() => botApi.profile(discordId), [discordId]);
  const submissionThreads = useBotData(() => discordApi.threads("daily_problems", 60), []);
  const [submissions, setSubmissions] = useState<DiscordMessage[]>([]);
  useEffect(() => {
    let cancelled = false;
    const threads = submissionThreads.data?.threads ?? [];
    if (threads.length === 0) {
      setSubmissions([]);
      return () => { cancelled = true; };
    }
    void Promise.all(threads.map((thread) => discordApi.threadMessages(thread.thread_id)))
      .then((responses) => {
        if (cancelled) return;
        const messages = responses
          .flatMap((response) => response.messages.slice(1))
          .filter((message) => (
            message.author_id === discordId ||
            message.author_name?.toLowerCase() === data?.user.discord_username.toLowerCase()
          ) && submissionAttachments(message).length > 0)
          .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
        setSubmissions(messages);
      })
      .catch(() => { if (!cancelled) setSubmissions([]); });
    return () => { cancelled = true; };
  }, [discordId, submissionThreads.data]);
  const history = useBotData(
    () => botApi.duels({ discord_id: discordId, limit: 15 }),
    [discordId]
  );

  return (
    <div className="flex flex-1 flex-col">
      <PageHeader
        number="07"
        title={data?.user.discord_username ?? "Profile"}
        blurb={isSelf ? "Your standing across every Binary Beats format." : undefined}
        aside={
          <Button
            variant="outline"
            size="md"
            className="w-full sm:w-auto"
            onClick={() => {
              playSound?.("click");
              navigate("leaderboards");
            }}
          >
            Back to boards
          </Button>
        }
      />

      <PageBody className="flex flex-col gap-8">
        <DataState
          state={state}
          error={error}
          data={data}
          onRetry={reload}
          skeleton={<SkeletonRows rows={4} height="h-20" />}
          empty={<EmptyState title="No such member" />}
        >
          {(p) => (
            <>
              <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <Stat label="Points" value={p.points} />
                <Stat label="Solved" value={p.solved} />
                <Stat label="Day streak" value={p.streak} />
                <Stat label="Formats" value={p.ratings.length} />
              </section>

              <section>
                <Eyebrow number="01">Linked handles</Eyebrow>
                <div className="mt-3 flex flex-wrap gap-2">
                  {p.handles.length === 0 && (
                    <span className="text-[13px] text-bb-ink-soft">No handles linked yet.</span>
                  )}
                  {p.handles.map((h) => (
                    <Panel key={`${h.platform}-${h.handle}`} className="flex items-center gap-2 px-3 py-2">
                      <span className="font-mono text-[11px] uppercase tracking-wider text-bb-ink-faint">
                        {h.platform}
                      </span>
                      <span className="text-[13px] font-semibold text-bb-ink">{h.handle}</span>
                      <Tag tone={h.verified ? "success" : "neutral"}>
                        {h.verified ? "verified" : "unverified"}
                      </Tag>
                    </Panel>
                  ))}
                </div>
              </section>

              <section>
                <Eyebrow number="02">Ratings by format</Eyebrow>
                {p.ratings.length === 0 ? (
                  <p className="mt-3 text-[13px] text-bb-ink-soft">
                    No rated matches yet. Ratings appear after the first duel.
                  </p>
                ) : (
                  <ul className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
                    {p.ratings.map((r) => (
                      <li key={r.mode}>
                        <Panel className="p-4">
                          <div className="flex items-baseline justify-between gap-2">
                            <span className="font-mono text-[11px] uppercase tracking-wider text-bb-ink-faint">
                              {r.mode}
                            </span>
                            <span className="font-hud text-2xl font-bold tabular-nums text-bb-yellow">
                              {r.rating}
                            </span>
                          </div>
                          <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 font-mono text-[11px] text-bb-ink-soft">
                            <span>{r.wins}W</span>
                            <span>{r.losses}L</span>
                            <span>{r.draws}D</span>
                            <span className={r.streak > 0 ? "text-bb-success" : r.streak < 0 ? "text-bb-danger" : ""}>
                              streak {r.streak > 0 ? `+${r.streak}` : r.streak}
                            </span>
                          </div>
                        </Panel>
                      </li>
                    ))}
                  </ul>
                )}
              </section>

              <section>
                <Eyebrow number="03">Recent solves</Eyebrow>
                {p.recent_solves.length === 0 ? (
                  <p className="mt-3 text-[13px] text-bb-ink-soft">Nothing solved yet.</p>
                ) : (
                  <ul className="mt-3 flex flex-col gap-2">
                    {p.recent_solves.map((s, i) => (
                      <li key={`${s.platform}-${s.problem_id}-${i}`}>
                        <Panel className="flex flex-wrap items-center gap-x-3 gap-y-1.5 p-3">
                          <Tag tone="neutral" bracket>
                            {s.platform}
                          </Tag>
                          <span className="min-w-0 flex-1 truncate text-[13px] text-bb-ink">
                            {s.title || s.problem_id}
                          </span>
                          <span className="font-hud text-sm tabular-nums text-bb-yellow">
                            +{s.points_awarded}
                          </span>
                        </Panel>
                      </li>
                    ))}
                  </ul>
                )}
              </section>

              <section>
                <Eyebrow number="04">Recent submissions</Eyebrow>
                {submissions.length === 0 ? (
                  <p className="mt-3 text-[13px] text-bb-ink-soft">No daily problem submissions yet.</p>
                ) : (
                  <ul className="mt-3 flex flex-col gap-2">
                    {submissions.slice(0, 20).map((message) => (
                      <li key={message.message_id}>
                        <Panel className="p-3">
                          <div className="flex items-center justify-between gap-3">
                            <span className="font-mono text-[11px] font-bold text-bb-ink">{message.author_name}</span>
                            <span className="font-mono text-[10px] text-bb-ink-faint">{new Date(message.created_at).toLocaleDateString()}</span>
                          </div>
                          <div className="mt-2 flex flex-wrap gap-2">
                            {submissionAttachments(message).map((attachment) => (
                              <a key={attachment.id} href={attachment.url} target="_blank" rel="noreferrer" className="rounded border border-bb-line-strong px-2 py-1 font-mono text-[10px] text-bb-yellow hover:border-bb-yellow">
                                {attachment.filename}
                              </a>
                            ))}
                          </div>
                        </Panel>
                      </li>
                    ))}
                  </ul>
                )}
              </section>

              <section>
                <Eyebrow number="05">Match history</Eyebrow>
                <div className="mt-3">
                  <DataState
                    state={history.state}
                    error={history.error}
                    data={history.data}
                    onRetry={history.reload}
                    skeleton={<SkeletonRows rows={3} height="h-12" />}
                    isEmpty={(d) => d.duels.length === 0}
                    empty={<EmptyState title="No finished duels yet" />}
                  >
                    {(d) => (
                      <ul className="flex flex-col gap-2">
                        {d.duels.map((m) => {
                          const won = m.winner_id === discordId;
                          const drew = !m.winner_id;
                          const opponent =
                            m.player1_id === discordId
                              ? m.is_bot_match
                                ? "Bot"
                                : m.player2_name ?? "—"
                              : m.player1_name ?? "—";
                          return (
                            <li key={m.id}>
                              <Panel className="flex flex-wrap items-center gap-x-3 gap-y-1.5 p-3">
                                <Tag tone={drew ? "neutral" : won ? "success" : "danger"}>
                                  {drew ? "draw" : won ? "win" : "loss"}
                                </Tag>
                                <span className="font-mono text-[11px] uppercase text-bb-ink-faint">
                                  {m.mode}
                                </span>
                                <span className="min-w-0 flex-1 truncate text-[13px] text-bb-ink">
                                  vs {opponent}
                                </span>
                                <span className="font-mono text-[11px] tabular-nums text-bb-ink-soft">
                                  {m.p1_games_won}–{m.p2_games_won}
                                </span>
                              </Panel>
                            </li>
                          );
                        })}
                      </ul>
                    )}
                  </DataState>
                </div>
              </section>
            </>
          )}
        </DataState>
      </PageBody>
    </div>
  );
};
