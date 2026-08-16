import React, { useMemo, useState } from "react";
import { botApi, discordApi, type DailyProblem } from "../../lib/botApi";
import { useBotData } from "../../hooks/useBotData";
import { DISCORD_INVITE } from "../../data/site";
import { PageHeader, PageBody, DataState, SkeletonRows, EmptyState } from "../ui/PageShell";
import { Panel } from "../ui/Panel";
import { Button } from "../ui/Button";
import { Tag } from "../ui/Tag";
import { Eyebrow } from "../ui/Eyebrow";

interface Props {
  gateReason: "anon" | "outsider" | null;
  onLogin?: () => void;
  playSound?: (t: "click" | "hover") => void;
}

const PLATFORMS = [
  { id: "", label: "All" },
  { id: "codeforces", label: "Codeforces" },
  { id: "leetcode", label: "LeetCode" },
  { id: "atcoder", label: "AtCoder" },
  { id: "codechef", label: "CodeChef" },
];

const DIFF_TONE: Record<string, "success" | "warning" | "danger" | "neutral"> = {
  easy: "success",
  medium: "warning",
  hard: "danger",
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

function groupByDate(problems: DailyProblem[]): [string, DailyProblem[]][] {
  const map = new Map<string, DailyProblem[]>();
  for (const p of problems) {
    const key = p.assigned_date?.slice(0, 10) ?? "undated";
    const list = map.get(key) ?? [];
    list.push(p);
    map.set(key, list);
  }
  return [...map.entries()];
}

function humanDate(iso: string): string {
  if (iso === "undated") return "Undated";
  const d = new Date(`${iso}T00:00:00`);
  const today = new Date();
  const diff = Math.round((today.setHours(0, 0, 0, 0) - d.getTime()) / 86_400_000);
  if (diff === 0) return "Today";
  if (diff === 1) return "Yesterday";
  return d.toLocaleDateString(undefined, { day: "2-digit", month: "short", year: "numeric" });
}

export const DailyProblemsPage: React.FC<Props> = ({ gateReason, onLogin, playSound }) => {
  const [platform, setPlatform] = useState<string>(
    () => sessionStorage.getItem("bb_daily_platform") ?? ""
  );

  React.useEffect(() => {
    sessionStorage.setItem("bb_daily_platform", platform);
  }, [platform]);
  const { data, state, error, reload } = useBotData(
    () => botApi.problems({ limit: 60, platform: platform || undefined }),
    [platform]
  );

  const groups = useMemo(
    () => (data ? groupByDate(data.problems) : []),
    [data]
  );

  return (
    <div className="flex flex-1 flex-col">
      <PageHeader
        number="02"
        title="Daily Problems"
        blurb="Every problem the bot has posted, newest first. Anyone can browse; solving and points happen through Discord."
        aside={
          gateReason && (
            <Button
              as="a"
              href={gateReason === "outsider" ? DISCORD_INVITE : undefined}
              target={gateReason === "outsider" ? "_blank" : undefined}
              rel="noreferrer"
              variant="primary"
              size="md"
              className="w-full sm:w-auto"
              onClick={gateReason === "anon" ? onLogin : undefined}
            >
              {gateReason === "anon" ? "Sign in with Discord" : "Join to submit"}
            </Button>
          )
        }
      />

      <PageBody className="flex flex-col gap-5">
        <div className="-mx-4 overflow-x-auto px-4 pb-1 sm:mx-0 sm:px-0 no-scrollbar">
          <div className="flex w-max min-w-full gap-2">
            {PLATFORMS.map((p) => {
              const active = p.id === platform;
              return (
                <button
                  key={p.id || "all"}
                  onClick={() => {
                    playSound?.("click");
                    setPlatform(p.id);
                  }}
                  onMouseEnter={() => playSound?.("hover")}
                  className={`shrink-0 rounded border-[1.5px] px-3 py-2 font-mono text-[11px] font-bold uppercase tracking-wider transition-colors cursor-pointer ${
                    active
                      ? "border-bb-border-hard bg-bb-yellow text-bb-ground"
                      : "border-bb-line-strong text-bb-ink-soft hover:border-bb-ink hover:text-bb-ink"
                  }`}
                >
                  {p.label}
                </button>
              );
            })}
          </div>
        </div>

        <DataState
          state={state}
          error={error}
          data={data}
          onRetry={reload}
          skeleton={<SkeletonRows rows={6} height="h-20" />}
          isEmpty={(d) => d.problems.length === 0}
          empty={
            <EmptyState
              title="No problems yet"
              body="Once the bot posts a daily problem, it shows up here automatically."
            />
          }
        >
          {() => (
            <div className="flex flex-col gap-7">
              {groups.map(([date, items]) => (
                <section key={date}>
                  <Eyebrow tone="muted">{humanDate(date)}</Eyebrow>
                  <ul className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
                    {items.map((p) => {
                      const url = problemUrl(p);
                      const tone = DIFF_TONE[p.difficulty?.toLowerCase()] ?? "neutral";
                      return (
                        <li key={p.id} className="flex">
                          <Panel
                            lift
                            className="flex w-full flex-col gap-3 p-4 border-bb-line-strong"
                          >
                            <div className="flex flex-wrap items-center gap-2">
                              <Tag tone="neutral" bracket>
                                {p.platform}
                              </Tag>
                              <Tag tone={tone}>{p.difficulty}</Tag>
                              <span className="ml-auto font-hud text-sm font-bold tabular-nums text-bb-yellow">
                                {p.points} pts
                              </span>
                            </div>

                            <h3 className="min-w-0 break-words text-[15px] font-semibold leading-snug text-bb-ink">
                              {p.title || p.problem_id}
                            </h3>

                            <div className="mt-auto flex items-center justify-between gap-2 border-t border-bb-line pt-3">
                              <span className="font-mono text-[11px] text-bb-ink-faint">
                                {p.solve_count} solved
                              </span>
                              {url && (
                                <Button
                                  as="a"
                                  href={url}
                                  target="_blank"
                                  rel="noreferrer"
                                  variant="primary"
                                  size="sm"
                                  onClick={(e) => e.stopPropagation()}
                                  onMouseEnter={() => playSound?.("hover")}
                                >
                                  Solve on {p.platform} ↗
                                </Button>
                              )}
                            </div>
                          </Panel>
                        </li>
                      );
                    })}
                  </ul>
                </section>
              ))}
            </div>
          )}
        </DataState>
      </PageBody>
    </div>
  );
};
