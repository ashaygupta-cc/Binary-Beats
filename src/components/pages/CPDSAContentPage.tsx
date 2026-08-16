import React, { useMemo, useState } from "react";
import { botApi, discordApi, type DailyProblem, type DiscordMessage, type ApiContest } from "../../lib/botApi";
import { useBotData } from "../../hooks/useBotData";
import { navigate } from "../../lib/router";
import { PageHeader, PageBody, DataState, SkeletonRows, EmptyState } from "../ui/PageShell";
import { Panel } from "../ui/Panel";
import { Button } from "../ui/Button";
import { Tag } from "../ui/Tag";
import { Eyebrow } from "../ui/Eyebrow";
import { DISCORD_INVITE } from "../../data/site";
import { ArticleView } from "../renderers/ArticleView";
import { RoadmapView } from "../renderers/RoadmapView";
import { ContestCalendarView } from "../renderers/ContestCalendarView";
import type { DiscordUser } from "../../hooks/useDiscordAuth";
import { dailyProblemToSolvable } from "../solve/adapters";
import { getProblemExternalUrl } from "../solve/types";
import { useProblems } from "../../hooks/useProblems";
import { SolveWorkspace } from "../solve/SolveWorkspace";
import type { SolvableProblem } from "../solve/types";


interface Props {
  user: DiscordUser | null;
  gateReason: "anon" | "outsider" | null;
  onLogin?: () => void;
  playSound?: (t: "click" | "hover") => void;
}

type ContentTab = "problems" | "oa" | "theory" | "roadmap" | "contests";

const TABS: { id: Exclude<ContentTab, "roadmap" | "contests">; label: string }[] = [
  { id: "problems", label: "Daily Problems" },
  { id: "oa", label: "OA Questions" },
  { id: "theory", label: "Algorithmic Theory" },
];

interface TodayContestGridProps {
  contests: ApiContest[];
  onClick: () => void;
}

const TodayContestGrid: React.FC<TodayContestGridProps> = ({ contests, onClick }) => {
  const todayStart = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);

  const todayEnd = useMemo(() => {
    const d = new Date();
    d.setHours(23, 59, 59, 999);
    return d;
  }, []);

  const platforms = useMemo(() => {
    const todayContests = contests.filter((c) => {
      const d = new Date(c.start_ts * 1000);
      return d >= todayStart && d <= todayEnd;
    });

    const pMap = {
      cf: { label: "CF", color: "#1F8ACB", count: 0 },
      lc: { label: "LC", color: "#FFA116", count: 0 },
      cc: { label: "CC", color: "#6B3A2A", count: 0 },
      atcoder: { label: "AC", color: "#ED4245", count: 0 },
    };

    for (const c of todayContests) {
      const key = c.platform.toLowerCase();
      if (key in pMap) {
        pMap[key as keyof typeof pMap].count++;
      }
    }
    return Object.values(pMap);
  }, [contests, todayStart, todayEnd]);

  return (
    <Panel
      role="button"
      tabIndex={0}
      onClick={onClick}
      className="flex cursor-pointer flex-col gap-1 p-2 px-3 border-bb-line-strong hover:border-bb-yellow transition-all w-52 select-none shadow-md shrink-0 bg-bb-surface-2/10"
    >
      <div className="flex items-center justify-between">
        <span className="font-mono text-[9px] uppercase tracking-[0.14em] text-bb-ink-faint">
          Contests Today
        </span>
        <span className="font-mono text-[8px] text-bb-yellow uppercase font-bold tracking-wider">
          View Calendar →
        </span>
      </div>
      <div className="grid grid-cols-4 gap-1">
        {platforms.map((p) => (
          <div
            key={p.label}
            className="flex flex-col items-center justify-center rounded bg-bb-ground/40 py-0.5 border-[1px] border-bb-line/60"
          >
            <span className="font-mono text-[9px] font-bold" style={{ color: p.color }}>
              {p.label}
            </span>
            <span
              className={`font-hud text-[10px] tabular-nums font-bold leading-none mt-0.5 ${
                p.count > 0 ? "text-bb-success" : "text-bb-ink-faint/60"
              }`}
            >
              {p.count > 0 ? `${p.count}` : "0"}
            </span>
          </div>
        ))}
      </div>
    </Panel>
  );
};

const DIFF_TONE: Record<string, "success" | "warning" | "danger" | "neutral"> = {
  easy: "success", medium: "warning", hard: "danger",
};

function problemUrl(p: DailyProblem): string | null {
  const id = p.problem_id;
  const platform = p.platform.toLowerCase();

  if (platform === "leetcode" || platform === "lc") {
    const slug = id.replace(/^LC-/, "");
    return `https://leetcode.com/problems/${slug}/`;
  }
  if (platform === "atcoder" || platform === "ac") {
    const parts = id.split("_");
    const contest = parts[0] ? parts[0].toLowerCase() : id.toLowerCase();
    return `https://atcoder.jp/contests/${contest}/tasks/${id}`;
  }
  if (platform === "codechef" || platform === "cc") {
    return `https://www.codechef.com/problems/${id}`;
  }
  if (platform === "codeforces" || platform === "cf") {
    const m = id.match(/^(\d+)([A-Za-z]\d?)$/);
    return m ? `https://codeforces.com/problemset/problem/${m[1]}/${m[2]}` : `https://codeforces.com/problemset`;
  }
  return null;
}

function dateStr(offset: number): string {
  const d = new Date();
  d.setDate(d.getDate() + offset);
  return d.toISOString().slice(0, 10);
}

function humanDate(iso: string): string {
  const d = new Date(`${iso}T00:00:00`);
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const diff = Math.round((today.getTime() - d.getTime()) / 86_400_000);
  if (diff === 0) return "Today";
  if (diff === 1) return "Yesterday";
  if (diff === -1) return "Tomorrow";
  return d.toLocaleDateString(undefined, { weekday: "short", day: "numeric", month: "short" });
}

/** Extract title from article content */
function articleTitle(content: string): string {
  const lines = content.split("\n");
  for (const line of lines) {
    const t = line.trim();
    if (!t) continue;
    const h = t.match(/^#{1,3}\s+(.+)$/);
    if (h) return h[1].replace(/\*\*/g, "").trim();
    if (/^\*\*/.test(t)) return t.replace(/\*\*/g, "").trim();
    if (t.length < 100 && !t.startsWith("```")) return t.replace(/\*\*/g, "").trim();
    break;
  }
  return "Untitled";
}

function relative(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const d = Math.floor(diff / 86_400_000);
  if (d < 1) return "today";
  if (d === 1) return "1d ago";
  if (d < 30) return `${d}d ago`;
  return new Date(iso).toLocaleDateString(undefined, { day: "2-digit", month: "short" });
}

interface MoreProblemsSectionProps {
  playSound?: (t: "click" | "hover") => void;
  onSelectProblem: (p: SolvableProblem) => void;
}

const MoreProblemsSection: React.FC<MoreProblemsSectionProps> = ({ playSound, onSelectProblem }) => {
  const [platform, setPlatform] = useState<"codeforces" | "leetcode" | "">(
    () => (sessionStorage.getItem("bb_library_platform") as any) ?? "codeforces"
  );
  const [search, setSearch] = useState(
    () => sessionStorage.getItem("bb_library_search") ?? ""
  );
  const [difficulty, setDifficulty] = useState<"easy" | "medium" | "hard" | "">(
    () => (sessionStorage.getItem("bb_library_difficulty") as any) ?? ""
  );
  const [selectedTag] = useState<string | null>(null);
  const [page, setPage] = useState(
    () => Number(sessionStorage.getItem("bb_library_page") || 1)
  );

  React.useEffect(() => {
    sessionStorage.setItem("bb_library_platform", platform);
  }, [platform]);

  React.useEffect(() => {
    sessionStorage.setItem("bb_library_search", search);
  }, [search]);

  React.useEffect(() => {
    sessionStorage.setItem("bb_library_difficulty", difficulty);
  }, [difficulty]);

  React.useEffect(() => {
    sessionStorage.setItem("bb_library_page", String(page));
  }, [page]);

  const { problems, total, pages, loading, error } = useProblems({
    search,
    difficulty,
    tags: selectedTag ? [selectedTag] : [],
    platform,
    page,
    pageSize: 15,
  });

  return (
    <section className="mt-8 pt-8 border-t border-bb-line flex flex-col gap-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <Eyebrow>More Problems Library</Eyebrow>
            <Tag tone="neutral">9,982 CF / 2,650 LC</Tag>
          </div>
          <p className="text-xs font-mono text-bb-ink-faint mt-1">
            Browse &amp; practice full problem sets. <span className="text-bb-yellow font-bold">Note:</span> Practice solves here do not affect daily problem streak.
          </p>
        </div>

        {/* Platform toggle bar */}
        <div className="flex rounded border border-bb-line bg-bb-surface p-0.5 font-mono text-[11px] gap-0.5 shrink-0">
          {[
            { id: "codeforces" as const, label: "Codeforces (9,982+)" },
            { id: "leetcode" as const, label: "LeetCode (2,650+)" },
            { id: "" as const, label: "All" },
          ].map((pl) => (
            <button
              key={pl.id}
              onClick={() => {
                playSound?.("click");
                setPlatform(pl.id);
                setPage(1);
              }}
              className={`px-3 py-1 rounded-sm font-bold cursor-pointer transition-colors ${
                platform === pl.id ? "bg-bb-ink text-bb-ground" : "text-bb-ink-faint hover:text-bb-ink"
              }`}
            >
              {pl.label}
            </button>
          ))}
        </div>
      </div>

      {/* Filters row */}
      <div className="flex flex-col sm:flex-row gap-2.5">
        <div className="relative flex-1">
          <input
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            placeholder="Search problem title or index..."
            className="w-full h-9 pl-3 pr-3 rounded text-xs font-mono text-bb-ink placeholder-bb-ink-faint focus:outline-none bg-bb-surface border border-bb-line focus:border-bb-line-strong transition-colors"
          />
        </div>
        <div className="flex rounded border border-bb-line bg-bb-surface p-0.5 font-mono text-[11px] gap-0.5">
          {(["", "easy", "medium", "hard"] as const).map((d) => (
            <button
              key={d}
              onClick={() => { playSound?.("click"); setDifficulty(d); setPage(1); }}
              className={`px-3 h-7 rounded-sm font-bold cursor-pointer transition-colors ${
                difficulty === d ? "bg-bb-ink text-bb-ground" : "text-bb-ink-faint hover:text-bb-ink-soft"
              }`}
            >
              {d === "" ? "All Diff" : d[0].toUpperCase() + d.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Table header */}
      <div className="grid grid-cols-[1fr_100px_90px_130px] gap-2 items-center px-4 font-mono text-[10px] font-bold uppercase tracking-wider text-bb-ink-faint select-none">
        <span>Problem</span>
        <span className="text-center">Difficulty</span>
        <span className="text-center">Rating</span>
        <span className="text-right">Action</span>
      </div>

      {/* Problem list */}
      <div className="flex flex-col gap-1.5">
        {loading ? (
          Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-14 rounded bg-bb-ink/[0.02] border border-bb-line animate-pulse" />
          ))
        ) : error ? (
          <div className="py-8 text-center text-xs text-bb-danger font-mono border border-dashed border-bb-danger/30 rounded">
            {error}
          </div>
        ) : problems.length === 0 ? (
          <div className="py-12 text-center text-xs text-bb-ink-faint font-mono border border-dashed border-bb-line rounded">
            No problems match your search filters.
          </div>
        ) : (
          problems.map((p, idx) => {
            const keyStr = p.key || p.problem_id || (p.id ? String(p.id) : `prob-${idx}`);
            const platformStr = (p.platform || "").toLowerCase();
            const platformName = keyStr.startsWith("LC-") || platformStr.includes("lc") || platformStr.includes("leetcode") ? "LeetCode" : "Codeforces";
            const diff = p.rating != null ? (p.rating < 1200 ? "Easy" : p.rating < 1600 ? "Medium" : "Hard") : (p.difficulty || "Unrated");
            const diffTone = diff === "Easy" ? "success" : diff === "Medium" ? "warning" : diff === "Hard" ? "danger" : "neutral";
            const tagsList = Array.isArray(p.tags) ? p.tags : [];
            const url = getProblemExternalUrl({
              key: keyStr,
              contestId: p.contestId,
              index: p.index,
              title: p.title || keyStr,
              rating: p.rating,
              tags: tagsList,
              judgeable: p.judgeable,
              platform: platformName.toLowerCase(),
            });

            return (
              <div
                key={keyStr}
                className="grid grid-cols-[1fr_100px_90px_130px] gap-2 items-center px-4 py-3 rounded bg-bb-surface border border-bb-line hover:border-bb-yellow/60 transition-all"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-[10px] text-bb-ink-faint font-bold">{p.contestId ? `${p.contestId}${p.index}` : keyStr}</span>
                    <span className="text-sm font-semibold text-bb-ink truncate font-mono">
                      {p.title && p.title !== keyStr && p.title !== `${p.contestId}${p.index}` ? p.title : `Problem ${keyStr}`}
                    </span>
                  </div>
                  {tagsList.length > 0 && (
                    <div className="flex items-center gap-1 mt-1 flex-wrap">
                      {tagsList.slice(0, 3).map((t) => (
                        <span key={t} className="text-[9px] font-mono text-bb-ink-faint bg-bb-ground px-1.5 py-0.5 rounded border border-bb-line">
                          {t}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                <div className="text-center">
                  <Tag tone={diffTone}>{diff}</Tag>
                </div>

                <div className="text-center font-mono text-xs text-bb-ink-soft">
                  {p.rating ?? "—"}
                </div>

                <div className="text-right">
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => {
                      playSound?.("click");
                      onSelectProblem({
                        key: p.key,
                        contestId: p.contestId,
                        index: p.index,
                        title: p.title || p.key,
                        rating: p.rating,
                        tags: p.tags,
                        judgeable: p.judgeable,
                        platform: p.key.startsWith("LC-") || p.platform === "leetcode" ? "leetcode" : "codeforces",
                      });
                    }}
                  >
                    Solve
                  </Button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Pagination */}
      {pages > 1 && (
        <div className="flex items-center justify-between pt-2 text-[10px] font-mono text-bb-ink-faint">
          <span>Showing page {page} of {pages} ({total.toLocaleString()} problems)</span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="px-2 py-1 rounded border border-bb-line text-bb-ink-faint hover:text-bb-ink disabled:opacity-30 cursor-pointer"
            >
              ← Prev
            </button>
            <span className="text-bb-ink tabular-nums">{page} / {pages}</span>
            <button
              onClick={() => setPage((p) => Math.min(pages, p + 1))}
              disabled={page >= pages}
              className="px-2 py-1 rounded border border-bb-line text-bb-ink-faint hover:text-bb-ink disabled:opacity-30 cursor-pointer"
            >
              Next →
            </button>
          </div>
        </div>
      )}
    </section>
  );
};

export const CPDSAContentPage: React.FC<Props> = ({ user, gateReason, onLogin, playSound }) => {
  const [tab, setTab] = useState<ContentTab>(
    () => (sessionStorage.getItem("bb_cpdsa_tab") as any) ?? "problems"
  );
  const [dateOffset, setDateOffset] = useState(0);

  React.useEffect(() => {
    sessionStorage.setItem("bb_cpdsa_tab", tab);
  }, [tab]);

  const [activeSolvableProblem, setActiveSolvableProblem] = useState<SolvableProblem | null>(null);

  React.useEffect(() => {
    const handlePopState = () => {
      setActiveSolvableProblem(null);
    };
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  const handleOpenProblem = (p: SolvableProblem) => {
    window.history.pushState({ solve: true }, "");
    setActiveSolvableProblem(p);
  };

  const handleCloseProblem = () => {
    if (window.history.state?.solve) {
      window.history.back();
    } else {
      setActiveSolvableProblem(null);
    }
  };

  // ── Data fetching ─────────────────────────────────────────────
  const problems = useBotData(() => botApi.problems({ limit: 60 }), []);
  const oaThreads = useBotData(() => discordApi.threads("oa_questions"), [], { enabled: tab === "oa" });
  const mathsThreads = useBotData(
    () => discordApi.threads("maths_lounge"),
    [],
    { enabled: tab === "theory" || tab === "problems" }
  );
  const roadmapMsgs = useBotData(
    () => discordApi.messages("cp_dsa_roadmap", { limit: 30 }),
    [],
    { enabled: tab === "roadmap" }
  );
  const editorial = useBotData(
    () => discordApi.editorial(dateStr(dateOffset)),
    [dateOffset],
    { enabled: tab === "problems" }
  );
  const contestsData = useBotData(() => botApi.contests(), []);
  const contests = contestsData.data?.contests ?? [];

  // ── Today's problems (day-wise) ───────────────────────────────
  const selectedDate = dateStr(dateOffset);
  const todaysProblems = useMemo(() => {
    if (!problems.data) return [];
    return problems.data.problems.filter((p) => p.assigned_date?.slice(0, 10) === selectedDate);
  }, [problems.data, selectedDate]);

  // ── Maths articles (for slideshow) ────────────────────────────
  const mathsSlideshowThreads = useMemo(() => {
    if (!mathsThreads.data) return [];
    return mathsThreads.data.threads
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(0, 10);
  }, [mathsThreads.data]);

  // Problem URL helper for "Solve on platform" button
  const problemUrlFor = (p: DailyProblem): string => {
    const solvable = dailyProblemToSolvable(p);
    return getProblemExternalUrl(solvable);
  };

  if (activeSolvableProblem) {
    return (
      <div className="w-full min-h-[calc(100vh-64px)] text-bb-ink flex flex-col px-2.5 lg:px-4 py-2.5 lg:py-3">
        <SolveWorkspace
          mode="practice"
          problem={activeSolvableProblem}
          solved={false}
          onBack={handleCloseProblem}
          onAccepted={() => {
            playSound?.("click");
          }}
          playSound={playSound ?? (() => {})}
        />
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col">
      <PageHeader
        number="02"
        title="CP/DSA Content"
        blurb="Daily problems, OA questions, algorithmic theory, and the roadmap — all in one place."
        aside={
          <div className="flex flex-row items-center gap-3">
            {/* Roadmap Toggle */}
            <Button
              variant={tab === "roadmap" ? "primary" : "outline"}
              size="sm"
              onClick={() => {
                playSound?.("click");
                setTab(tab === "roadmap" ? "problems" : "roadmap");
              }}
              className="font-mono text-[11px] uppercase tracking-wider h-11 px-4 border-bb-line-strong hover:border-bb-yellow transition-all"
            >
              🗺️ {tab === "roadmap" ? "Daily View" : "Roadmap"}
            </Button>

            {/* Today's Contests widget */}
            <TodayContestGrid
              contests={contests}
              onClick={() => {
                playSound?.("click");
                setTab("contests");
              }}
            />
          </div>
        }
      />

      <PageBody className="flex flex-col gap-6">
        {/* ── Tab bar ──────────────────────────────────────── */}
        <div className="-mx-4 overflow-x-auto px-4 pb-1 sm:mx-0 sm:px-0 no-scrollbar">
          <div className="flex w-max min-w-full gap-2">
            {TABS.map((t) => (
              <button
                key={t.id}
                onClick={() => { playSound?.("click"); setTab(t.id); }}
                className={`shrink-0 rounded border-[1.5px] px-3 py-2 font-mono text-[11px] font-bold uppercase tracking-wider transition-colors cursor-pointer ${
                  tab === t.id
                    ? "border-bb-border-hard bg-bb-yellow text-bb-ground"
                    : "border-bb-line-strong text-bb-ink-soft hover:border-bb-ink hover:text-bb-ink"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {/* ── DAILY PROBLEMS TAB ───────────────────────────── */}
        {tab === "problems" && (
          <div className="flex flex-col gap-6">
            {/* Date navigator */}
            <div className="flex items-center justify-between gap-3">
              <button
                onClick={() => setDateOffset(dateOffset - 1)}
                className="flex h-8 w-8 items-center justify-center rounded border-[1.5px] border-bb-line-strong bg-bb-surface font-mono text-bb-ink-soft hover:border-bb-yellow hover:text-bb-yellow transition-colors"
              >‹</button>
              <div className="text-center">
                <span className="font-display text-lg font-bold uppercase tracking-tight text-bb-ink">
                  {humanDate(selectedDate)}
                </span>
                <p className="font-mono text-[10px] text-bb-ink-faint">{selectedDate}</p>
              </div>
              <button
                onClick={() => { if (dateOffset < 0) setDateOffset(dateOffset + 1); }}
                className={`flex h-8 w-8 items-center justify-center rounded border-[1.5px] border-bb-line-strong bg-bb-surface font-mono transition-colors ${
                  dateOffset >= 0 ? "text-bb-ink-faint/30 cursor-not-allowed" : "text-bb-ink-soft hover:border-bb-yellow hover:text-bb-yellow"
                }`}
                disabled={dateOffset >= 0}
              >›</button>
            </div>

            {/* Split layout: Problems grid + Editorial */}
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
              {/* Problems — 2 cols */}
              <div className="lg:col-span-2">
                <DataState
                  state={problems.state} error={problems.error} data={problems.data}
                  onRetry={problems.reload}
                  skeleton={<SkeletonRows rows={4} height="h-20" />}
                  isEmpty={() => todaysProblems.length === 0}
                  empty={<EmptyState title="No problems for this date" body="Try navigating to a different day." />}
                >
                  {() => (
                    <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                      {todaysProblems.map((p) => {
                        const tone = DIFF_TONE[p.difficulty?.toLowerCase()] ?? "neutral";
                        const url = problemUrlFor(p);
                        return (
                          <li key={p.id}>
                            <Panel
                              lift
                              className="flex flex-col gap-3 p-4 border-bb-line-strong hover:border-bb-yellow transition-all"
                            >
                              <div className="flex flex-wrap items-center gap-2">
                                <Tag tone="neutral" bracket>{p.platform}</Tag>
                                <Tag tone={tone}>{p.difficulty}</Tag>
                                <span className="ml-auto font-hud text-sm font-bold tabular-nums text-bb-yellow">
                                  {p.points} pts
                                </span>
                              </div>
                              <h3 className="min-w-0 break-words text-[15px] font-semibold leading-snug text-bb-ink">
                                {p.title || p.problem_id}
                              </h3>
                              <div className="mt-auto flex items-center justify-between gap-2 border-t border-bb-line pt-3 w-full">
                                <span className="font-mono text-[11px] text-bb-ink-faint">
                                  {p.solve_count} solved
                                </span>
                                <Button
                                  variant="primary"
                                  size="sm"
                                  onClick={(e: React.MouseEvent) => {
                                    e.stopPropagation();
                                    playSound?.("click");
                                    handleOpenProblem({
                                      key: p.problem_id,
                                      contestId: 0,
                                      index: p.problem_id,
                                      title: p.title || p.problem_id,
                                      rating: p.points ? p.points * 10 : 800,
                                      tags: [],
                                      judgeable: true,
                                      platform: p.platform.toLowerCase(),
                                    });
                                  }}
                                >
                                  Solve
                                </Button>
                              </div>
                            </Panel>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </DataState>
              </div>

              {/* Editorial sidebar — 1 col */}
              <div className="flex flex-col gap-3">
                <Eyebrow>Editorial</Eyebrow>
                {editorial.data?.status === "available" && editorial.data.thread ? (
                  <Panel className="p-4">
                    <Tag tone="success">Available</Tag>
                    <p className="mt-2 text-[14px] font-semibold text-bb-ink">
                      {editorial.data.thread.name}
                    </p>
                    <p className="mt-1 font-mono text-[11px] text-bb-ink-faint">
                      {editorial.data.thread.message_count} posts
                    </p>
                    {editorial.data.files?.filter((f) => f.is_pdf).map((f) => (
                      <a
                        key={f.id} href={f.url} target="_blank" rel="noreferrer"
                        className="mt-2 flex items-center gap-2 rounded border-[1.5px] border-bb-line-strong bg-bb-surface-2 p-2 font-mono text-[11px] text-bb-yellow hover:border-bb-yellow transition-colors"
                      >
                        <span className="uppercase">PDF</span>
                        <span className="truncate text-bb-ink-soft">{f.filename}</span>
                      </a>
                    ))}
                    <Button
                      variant="outline" size="sm" className="mt-3 w-full"
                      onClick={() => navigate(`c/editorials/${editorial.data!.thread!.thread_id}`)}
                    >
                      View Editorial
                    </Button>
                  </Panel>
                ) : editorial.data?.status === "coming_soon" ? (
                  <Panel className="p-4">
                    <Tag tone="warning">Coming Soon</Tag>
                    <p className="mt-2 text-[13px] text-bb-ink-soft">
                      Editorial for {selectedDate} is being prepared.
                    </p>
                  </Panel>
                ) : (
                  <Panel className="p-4">
                    <p className="text-[13px] text-bb-ink-faint">
                      No editorial for this date yet.
                    </p>
                  </Panel>
                )}

                {/* Auth gate */}
                {gateReason && (
                  <Panel className="border-l-4 border-l-bb-yellow p-4">
                    <p className="text-[13px] text-bb-ink-soft">
                      Sign in and join the server to submit solutions and earn points.
                    </p>
                    <Button
                      variant="primary" size="sm" className="mt-2 w-full"
                      onClick={gateReason === "anon" ? onLogin : undefined}
                      as={gateReason === "outsider" ? "a" : undefined}
                      href={gateReason === "outsider" ? DISCORD_INVITE : undefined}
                      target={gateReason === "outsider" ? "_blank" : undefined}
                    >
                      {gateReason === "anon" ? "Sign in" : "Join Server"}
                    </Button>
                  </Panel>
                )}
              </div>
            </div>

            {/* Algorithmic Theory slideshow at bottom */}
            {mathsSlideshowThreads.length > 0 && (
              <section>
                <div className="flex items-center justify-between">
                  <Eyebrow>Algorithmic Theory</Eyebrow>
                  <button
                    onClick={() => { playSound?.("click"); setTab("theory"); }}
                    className="font-mono text-[11px] text-bb-yellow hover:underline underline-offset-2"
                  >
                    View all →
                  </button>
                </div>
                <div className="mt-3 -mx-4 overflow-x-auto px-4 pb-2 no-scrollbar">
                  <div className="flex w-max gap-3">
                    {mathsSlideshowThreads.map((t) => (
                      <Panel
                        key={t.thread_id} lift
                        className="w-64 shrink-0 cursor-pointer p-4"
                        role="button" tabIndex={0}
                        onClick={() => { playSound?.("click"); navigate(`c/maths/${t.thread_id}`); }}
                      >
                        <span className="font-mono text-[10px] text-bb-ink-faint">
                          {new Date(t.created_at).toLocaleDateString(undefined, {
                            day: "2-digit", month: "short", year: "numeric",
                          })}
                        </span>
                        <h4 className="mt-1 font-display text-[14px] font-bold uppercase leading-snug tracking-tight text-bb-ink line-clamp-2">
                          {t.name}
                        </h4>
                        <p className="mt-2 font-mono text-[10px] text-bb-ink-faint">
                          {t.message_count} posts
                        </p>
                      </Panel>
                    ))}
                  </div>
                </div>
              </section>
            )}

            {/* More Problems section below Algorithmic Theory */}
            <MoreProblemsSection playSound={playSound} onSelectProblem={handleOpenProblem} />
          </div>
        )}

        {/* ── OA QUESTIONS TAB ─────────────────────────────── */}
        {tab === "oa" && (
          <DataState
            state={oaThreads.state} error={oaThreads.error} data={oaThreads.data}
            onRetry={oaThreads.reload}
            skeleton={<SkeletonRows rows={6} height="h-20" />}
            isEmpty={(d) => d.threads.length === 0}
            empty={<EmptyState title="No OA questions synced" body="Run !syncchannel oa_questions in Discord." />}
          >
            {(d) => (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {d.threads.map((t) => (
                  <Panel
                    key={t.thread_id} lift role="button" tabIndex={0}
                    onClick={() => { playSound?.("click"); navigate(`c/oa-questions/${t.thread_id}`); }}
                    className="flex cursor-pointer flex-col gap-2 p-4"
                  >
                    <div className="flex items-center gap-2">
                      <Tag tone="accent">{t.has_pdf ? "Solution" : "OA"}</Tag>
                      <span className="font-mono text-[10px] text-bb-ink-faint">
                        {t.message_count} posts
                      </span>
                    </div>
                    <h3 className="font-display text-[15px] font-bold uppercase tracking-tight text-bb-ink">
                      {t.name}
                    </h3>
                    <p className="mt-auto font-mono text-[11px] text-bb-ink-faint">
                      {new Date(t.created_at).toLocaleDateString(undefined, {
                        day: "2-digit", month: "short", year: "numeric",
                      })}
                    </p>
                  </Panel>
                ))}
              </div>
            )}
          </DataState>
        )}

        {/* ── ALGORITHMIC THEORY TAB ───────────────────────── */}
        {tab === "theory" && (
          <DataState
            state={mathsThreads.state} error={mathsThreads.error} data={mathsThreads.data}
            onRetry={mathsThreads.reload}
            skeleton={<SkeletonRows rows={6} height="h-20" />}
            isEmpty={(d) => d.threads.length === 0}
            empty={<EmptyState title="No articles synced" body="Run !syncchannel maths_lounge in Discord." />}
          >
            {(d) => (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {d.threads.map((t) => (
                  <Panel
                    key={t.thread_id} lift role="button" tabIndex={0}
                    onClick={() => { playSound?.("click"); navigate(`c/maths/${t.thread_id}`); }}
                    className="flex cursor-pointer flex-col gap-2 p-4"
                  >
                    <div className="flex items-center gap-2">
                      <Tag tone="accent">Theory</Tag>
                      <span className="font-mono text-[10px] text-bb-ink-faint">
                        {t.message_count} posts
                      </span>
                    </div>
                    <h3 className="font-display text-[15px] font-bold uppercase tracking-tight text-bb-ink">
                      {t.name}
                    </h3>
                    <p className="mt-auto font-mono text-[11px] text-bb-ink-faint">
                      {new Date(t.created_at).toLocaleDateString(undefined, {
                        day: "2-digit", month: "short", year: "numeric",
                      })}
                    </p>
                  </Panel>
                ))}
              </div>
            )}
          </DataState>
        )}

        {/* ── ROADMAP TAB ──────────────────────────────────── */}
        {tab === "roadmap" && (
          <DataState
            state={roadmapMsgs.state} error={roadmapMsgs.error} data={roadmapMsgs.data}
            onRetry={roadmapMsgs.reload}
            skeleton={<SkeletonRows rows={4} height="h-24" />}
            isEmpty={(d) => d.messages.length === 0}
            empty={<EmptyState title="No roadmap synced" body="Run !syncchannel cp_dsa_roadmap in Discord." />}
          >
            {(d) => <RoadmapView messages={d.messages} />}
          </DataState>
        )}

        {/* ── CONTEST CALENDAR TAB ─────────────────────────── */}
        {tab === "contests" && <ContestCalendarView contestsData={contestsData} />}
      </PageBody>
    </div>
  );
};
