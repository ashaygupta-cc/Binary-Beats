import React, { useState } from "react";
import { botApi, discordApi, type DiscordMessage } from "../../lib/botApi";
import { useBotData } from "../../hooks/useBotData";
import { channelBySlug } from "../../data/channels";
import { navigate } from "../../lib/router";
import { PageHeader, PageBody, DataState, SkeletonRows, EmptyState } from "../ui/PageShell";
import { DiscordMessageCard, renderMarkdown } from "../discord/DiscordMessageCard";
import { Panel } from "../ui/Panel";
import { Button } from "../ui/Button";
import { Tag } from "../ui/Tag";

// ── Dedicated renderers ──────────────────────────────────────────
import { TeamView } from "../renderers/TeamView";
import { AboutView } from "../renderers/AboutView";
import { ArenaGuideView } from "../renderers/ArenaGuideView";
import { ArticleView } from "../renderers/ArticleView";
import { ContestCalendarView } from "../renderers/ContestCalendarView";
import { RoadmapView } from "../renderers/RoadmapView";
import { SocialLinksView } from "../renderers/SocialLinksView";

interface Props {
  slug: string;
  threadId?: string;
  playSound?: (t: "click" | "hover") => void;
}

/** Contest embeds carry the start time in a field; pull it out so past and
 *  upcoming can be separated instead of one undifferentiated stream. */
function contestTime(m: DiscordMessage): number | null {
  for (const e of m.embeds ?? []) {
    if (e.timestamp) return new Date(e.timestamp).getTime();
    for (const f of e.fields ?? []) {
      if (/start/i.test(f.name)) {
        const t = Date.parse(f.value.replace(/\s+in\s+.*$/i, "").trim());
        if (!Number.isNaN(t)) return t;
      }
    }
  }
  return null;
}

export const ChannelPage: React.FC<Props> = ({ slug, threadId, playSound }) => {
  const channel = channelBySlug(slug);
  const [search, setSearch] = useState("");

  const feed = useBotData(
    () => discordApi.messages(channel!.key, {
      limit: 60,
      q: search || undefined,
      threads: channel?.view === "article" ? "1" : undefined
    }),
    [channel?.key, search],
    { enabled: !!channel && channel.view !== "threads" && channel.view !== "forum" && !threadId }
  );

  const threads = useBotData(
    () => discordApi.threads(channel!.key),
    [channel?.key],
    { enabled: !!channel && (channel.view === "threads" || channel.view === "forum") && !threadId }
  );

  const thread = useBotData(
    () => discordApi.threadMessages(threadId!),
    [threadId],
    { enabled: !!threadId }
  );

  const contestsData = useBotData(
    () => botApi.contests(),
    [],
    { enabled: !!channel && channel.view === "contests" && !threadId }
  );

  if (!channel) {
    return (
      <>
        <PageHeader number="404" title="Unknown channel" blurb={`No channel maps to "${slug}".`} />
        <PageBody>
          <EmptyState
            title="Not mirrored"
            body="This channel isn't in the sync list yet."
            action={<Button variant="primary" size="md" onClick={() => navigate("community")}>Back to Community</Button>}
          />
        </PageBody>
      </>
    );
  }

  // ── STATIC RENDERERS (no API data needed) ────────────────────────
  // These channels use pre-curated data from static.ts
  if (channel.view === "team" && !threadId) {
    return (
      <>
        <PageHeader number="—" title={channel.label} blurb={channel.blurb} />
        <PageBody><TeamView /></PageBody>
      </>
    );
  }

  if (channel.key === "server_info" && !threadId) {
    return (
      <>
        <PageHeader number="—" title="About Binary Beats" blurb="Everything you need to know." />
        <PageBody><AboutView /></PageBody>
      </>
    );
  }

  if (channel.key === "arena_guide" && !threadId) {
    return (
      <>
        <PageHeader number="—" title={channel.label} blurb={channel.blurb} />
        <PageBody><ArenaGuideView /></PageBody>
      </>
    );
  }

  // Contest calendar — fetches directly from platform APIs, not Discord messages
  if (channel.view === "contests" && !threadId) {
    return (
      <>
        <PageHeader number="—" title={channel.label} blurb={channel.blurb} />
        <PageBody><ContestCalendarView contestsData={contestsData} /></PageBody>
      </>
    );
  }

  if (channel.key === "find_us_online" && !threadId) {
    return (
      <>
        <PageHeader number="—" title={channel.label} blurb={channel.blurb} />
        <PageBody><SocialLinksView /></PageBody>
      </>
    );
  }

  // ── single thread (an editorial or an article) ──────────────────
  if (threadId) {
    return (
      <>
        <PageHeader
          number="—"
          title={channel.label}
          blurb="Thread contents, synced from Discord."
          aside={
            <Button variant="outline" size="md" className="w-full sm:w-auto"
                    onClick={() => navigate(`c/${channel.slug}`)}>
              Back to {channel.label}
            </Button>
          }
        />
        <PageBody>
          <DataState
            state={thread.state} error={thread.error} data={thread.data} onRetry={thread.reload}
            skeleton={<SkeletonRows rows={4} height="h-24" />}
            isEmpty={(d) => d.messages.length === 0}
            empty={<EmptyState title="Empty thread" />}
          >
            {(d) => (
              <div className="flex flex-col gap-3">
                {d.messages.map((m) => <DiscordMessageCard key={m.message_id} message={m} />)}
              </div>
            )}
          </DataState>
        </PageBody>
      </>
    );
  }

  // ── thread index (daily editorials, OA questions forum, etc.) ──────
  if (channel.view === "threads" || channel.view === "forum") {
    const isForum = channel.view === "forum";
    return (
      <>
        <PageHeader number="—" title={channel.label} blurb={channel.blurb} />
        <PageBody>
          <DataState
            state={threads.state} error={threads.error} data={threads.data} onRetry={threads.reload}
            skeleton={<SkeletonRows rows={6} height="h-16" />}
            isEmpty={(d) => d.threads.length === 0}
            empty={
              <EmptyState
                title={isForum ? "Nothing synced yet" : "No editorials synced yet"}
                body={`Run !syncchannel ${channel.key} in Discord to backfill this channel.`}
              />
            }
          >
            {(d) => (
              <ul className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
                {d.threads.map((t) => (
                  <li key={t.thread_id}>
                    <Panel
                      lift role="button" tabIndex={0}
                      onClick={() => { playSound?.("click"); navigate(`c/${channel.slug}/${t.thread_id}`); }}
                      onKeyDown={(e) => { if (e.key === "Enter") navigate(`c/${channel.slug}/${t.thread_id}`); }}
                      className="flex h-full cursor-pointer flex-col gap-2 p-4"
                    >
                      {!isForum && (
                        <div className="flex flex-wrap items-center gap-2">
                          <Tag tone={t.has_pdf ? "success" : "warning"}>
                            {t.has_pdf ? "editorial available" : "coming soon"}
                          </Tag>
                          {t.is_archived && <Tag tone="neutral">archived</Tag>}
                        </div>
                      )}
                      <p className="min-w-0 break-words text-[14px] font-semibold text-bb-ink">{t.name}</p>
                      <p className="mt-auto font-mono text-[11px] text-bb-ink-faint">
                        {isForum
                          ? `${t.message_count} ${t.message_count === 1 ? "reply" : "replies"}`
                          : `${t.editorial_date ?? new Date(t.created_at).toLocaleDateString()} · ${t.message_count} posts`}
                      </p>
                    </Panel>
                  </li>
                ))}
              </ul>
            )}
          </DataState>
        </PageBody>
      </>
    );
  }

  // ── DATA-DRIVEN DEDICATED RENDERERS ─────────────────────────────
  // These need Discord messages from the API but render them with
  // specialised components instead of the generic feed.

  const isArticle = channel.view === "article";
  const isRoadmap = channel.view === "roadmap";

  return (
    <>
      <PageHeader
        number="—"
        title={channel.label}
        blurb={channel.blurb}
        aside={
          !isArticle && !isRoadmap ? (
            <label className="relative block w-full sm:w-64">
              <span className="sr-only">Search {channel.label}</span>
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search…"
                className="h-9 w-full rounded border-[1.5px] border-bb-line-strong bg-bb-surface px-3 font-mono text-[12px] text-bb-ink placeholder:text-bb-ink-faint focus:border-bb-yellow focus:outline-none"
              />
            </label>
          ) : undefined
        }
      />
      <PageBody>
        <DataState
          state={feed.state} error={feed.error} data={feed.data} onRetry={feed.reload}
          skeleton={<SkeletonRows rows={5} height="h-28" />}
          isEmpty={(d) => d.messages.length === 0}
          empty={
            <EmptyState
              title={search ? "No match" : "Nothing synced yet"}
              body={search
                ? `Nothing in ${channel.label} matching "${search}".`
                : `Run !syncchannel ${channel.key} in Discord to backfill this channel.`}
            />
          }
        >
          {(d) => {
            // ── Maths Lounge / Algorithmic Theory ─────────────
            if (isArticle) {
              return <ArticleView messages={d.messages} />;
            }

            // ── Roadmap ───────────────────────────────────────
            if (isRoadmap) {
              return <RoadmapView messages={d.messages} />;
            }

            // ── Generic feed (updates, announcements, etc.) ───
            return (
              <div className="mx-auto flex max-w-3xl flex-col gap-3">
                {d.messages.map((m) => <DiscordMessageCard key={m.message_id} message={m} />)}
              </div>
            );
          }}
        </DataState>
      </PageBody>
    </>
  );
};
