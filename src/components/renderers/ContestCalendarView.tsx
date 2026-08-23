import React, { useState, useMemo } from "react";
import { botApi, type ApiContest } from "../../lib/botApi";
import { useBotData, type UseBotDataResult } from "../../hooks/useBotData";
import { Panel } from "../ui/Panel";
import { Eyebrow } from "../ui/Eyebrow";
import { DataState, SkeletonRows, EmptyState } from "../ui/PageShell";

/**
 * ContestCalendarView — fetches upcoming contests directly from platform APIs
 * (CF, LC, CC, AtCoder) via the bot's /api/contests endpoint.
 *
 * Bot fetches once per hour, proxy caches 5min. No Discord dependency.
 * Shows a monthly calendar grid + upcoming list.
 */

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

const PLATFORM_META: Record<string, { color: string; label: string }> = {
  cf:      { color: "#1F8ACB", label: "Codeforces" },
  lc:      { color: "#FFA116", label: "LeetCode" },
  cc:      { color: "#6B3A2A", label: "CodeChef" },
  atcoder: { color: "#ED4245", label: "AtCoder" },
};

function daysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}
function startDay(year: number, month: number): number {
  const d = new Date(year, month, 1).getDay();
  return d === 0 ? 6 : d - 1;
}

function fmtDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h && m) return `${h}h ${m}m`;
  if (h) return `${h}h`;
  return `${m}m`;
}

interface ContestCalendarViewProps {
  contestsData: UseBotDataResult<{ contests: ApiContest[]; cached: boolean }>;
}

export const ContestCalendarView: React.FC<ContestCalendarViewProps> = ({ contestsData }) => {
  const now = new Date();
  const [viewMonth, setViewMonth] = useState(now.getMonth());
  const [viewYear, setViewYear] = useState(now.getFullYear());

  const { data, state, error, reload } = contestsData;

  const contests = data?.contests ?? [];

  const numDays = daysInMonth(viewYear, viewMonth);
  const offset = startDay(viewYear, viewMonth);

  // Contests for this month's calendar
  const contestsByDay = useMemo(() => {
    const map = new Map<number, ApiContest[]>();
    for (const c of contests) {
      const d = new Date(c.start_ts * 1000);
      if (d.getMonth() === viewMonth && d.getFullYear() === viewYear) {
        const day = d.getDate();
        if (!map.has(day)) map.set(day, []);
        map.get(day)!.push(c);
      }
    }
    return map;
  }, [contests, viewMonth, viewYear]);

  // Upcoming (future)
  const upcoming = useMemo(() => {
    const nowTs = Date.now() / 1000;
    return contests
      .filter((c) => c.start_ts > nowTs)
      .sort((a, b) => a.start_ts - b.start_ts);
  }, [contests]);

  const prevMonth = () => {
    if (viewMonth === 0) { setViewMonth(11); setViewYear(viewYear - 1); }
    else setViewMonth(viewMonth - 1);
  };
  const nextMonth = () => {
    if (viewMonth === 11) { setViewMonth(0); setViewYear(viewYear + 1); }
    else setViewMonth(viewMonth + 1);
  };

  const isToday = (day: number) =>
    day === now.getDate() && viewMonth === now.getMonth() && viewYear === now.getFullYear();

  return (
    <DataState
      state={state} error={error} data={data} onRetry={reload}
      skeleton={<SkeletonRows rows={6} height="h-16" />}
      isEmpty={() => contests.length === 0}
      empty={<EmptyState title="No contests found" body="The bot couldn't reach any platform API right now. Try again later." />}
    >
      {() => (
        <div className="mx-auto flex max-w-5xl flex-col gap-8">
          {/* Header + month nav */}
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <Eyebrow>Contest Calendar</Eyebrow>
              <p className="mt-1 text-[13px] text-bb-ink-faint">
                Live from Codeforces, LeetCode, CodeChef & AtCoder APIs
                {data?.cached && <span className="ml-1 text-bb-ink-faint/50">(cached)</span>}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <button onClick={prevMonth}
                className="flex h-8 w-8 items-center justify-center rounded border-[1.5px] border-bb-line-strong bg-bb-surface font-mono text-bb-ink-soft hover:border-bb-yellow hover:text-bb-yellow transition-colors"
              >‹</button>
              <span className="min-w-[140px] text-center font-display text-lg font-bold uppercase tracking-tight text-bb-ink">
                {MONTHS[viewMonth]} {viewYear}
              </span>
              <button onClick={nextMonth}
                className="flex h-8 w-8 items-center justify-center rounded border-[1.5px] border-bb-line-strong bg-bb-surface font-mono text-bb-ink-soft hover:border-bb-yellow hover:text-bb-yellow transition-colors"
              >›</button>
            </div>
          </div>

          {/* Featured Binary Beats Official Contests */}
          <div className="flex flex-col gap-3 p-5 rounded-xl bg-bb-surface-2/80 border border-bb-yellow/40 shadow-sm">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-bb-yellow animate-pulse" />
                <span className="font-hud text-xs uppercase tracking-widest text-bb-yellow font-bold">
                  ＢＩＮＡＲＹ ＢＥＡＴＳ ＯＦＦＩＣＩＡＬ ＣＯＮＴＥＳＴＳ
                </span>
              </div>
              <span className="text-[10px] font-mono text-bb-ink/40">Registered via Discord !addcontest</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-1">
              {((data as any)?.custom_contests ?? [
                {
                  id: "bb-c1",
                  title: "Binary Beats Official Contest #1",
                  url: "https://codeforces.com/contests",
                  platform: "Codeforces",
                  start_time: "2026-08-20T18:00:00Z",
                },
                {
                  id: "bb-c2",
                  title: "Binary Beats ICPC Practice Gym",
                  url: "https://codeforces.com/group/hfiI9LqNuy/contests",
                  platform: "Codeforces",
                  start_time: "2026-08-25T17:00:00Z",
                }
              ]).map((c: any) => (
                <div key={c.id} className="p-4 rounded-lg bg-bb-ground border border-bb-line flex flex-col gap-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-mono font-bold text-bb-yellow px-2 py-0.5 rounded bg-bb-yellow/10 border border-bb-yellow/30">
                      {c.platform}
                    </span>
                    <span className="text-[10px] font-mono text-bb-ink/50 font-semibold">
                      Starts: {new Date(c.start_time).toLocaleDateString()}
                    </span>
                  </div>
                  <h4 className="text-sm font-bold text-bb-ink font-display truncate">
                    {c.title}
                  </h4>
                  <a
                    href={c.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded bg-bb-yellow text-bb-ground hover:bg-yellow-400 text-xs font-mono font-bold transition-all shadow-sm"
                  >
                    Participate ↗
                  </a>
                </div>
              ))}
            </div>
          </div>

          {/* Calendar grid */}
          <Panel className="overflow-hidden p-0">
            <div className="grid grid-cols-7 border-b border-bb-line bg-bb-surface-2/50">
              {DAYS.map((d) => (
                <div key={d} className="px-2 py-2 text-center font-mono text-[10px] uppercase tracking-[0.18em] text-bb-ink-faint">
                  {d}
                </div>
              ))}
            </div>
            <div className="grid grid-cols-7">
              {Array.from({ length: offset }).map((_, i) => (
                <div key={`b-${i}`} className="min-h-[72px] border-b border-r border-bb-line bg-bb-ground/50 sm:min-h-[90px]" />
              ))}
              {Array.from({ length: numDays }).map((_, i) => {
                const day = i + 1;
                const dayContests = contestsByDay.get(day) ?? [];
                const today = isToday(day);
                return (
                  <div key={day}
                    className={`relative min-h-[72px] border-b border-r border-bb-line p-1.5 sm:min-h-[90px] sm:p-2 ${today ? "bg-bb-yellow/5" : ""}`}
                  >
                    <span className={`font-mono text-[11px] tabular-nums ${today ? "font-bold text-bb-yellow" : "text-bb-ink-faint"}`}>
                      {day}
                    </span>
                    <div className="mt-1 flex flex-col gap-0.5">
                      {dayContests.slice(0, 3).map((c) => {
                        const meta = PLATFORM_META[c.platform] ?? { color: "#FFD400", label: c.platform };
                        return (
                          <a key={`${c.platform}-${c.id}`} href={c.url} target="_blank" rel="noreferrer"
                            className="group block truncate rounded px-1 py-0.5 text-[10px] leading-tight transition-opacity hover:opacity-80 sm:text-[11px]"
                            style={{ backgroundColor: meta.color + "22", color: meta.color }}
                            title={`${c.name} — ${new Date(c.start_ts * 1000).toLocaleString()}`}
                          >
                            {c.name.slice(0, 22)}
                          </a>
                        );
                      })}
                      {dayContests.length > 3 && (
                        <span className="px-1 font-mono text-[9px] text-bb-ink-faint">+{dayContests.length - 3} more</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </Panel>

          {/* Upcoming list */}
          {upcoming.length > 0 && (
            <section>
              <Eyebrow>Upcoming</Eyebrow>
              <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {upcoming.map((c) => {
                  const meta = PLATFORM_META[c.platform] ?? { color: "#FFD400", label: c.platform };
                  const startDate = new Date(c.start_ts * 1000);
                  return (
                    <a key={`${c.platform}-${c.id}`} href={c.url} target="_blank" rel="noreferrer" className="group">
                      <Panel lift className="p-4 transition-all">
                        <div className="flex items-center gap-2">
                          <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: meta.color }} />
                          <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-bb-ink-faint">
                            {meta.label}
                          </span>
                          {c.duration > 0 && (
                            <span className="ml-auto font-mono text-[10px] text-bb-ink-faint">
                              {fmtDuration(c.duration)}
                            </span>
                          )}
                        </div>
                        <p className="mt-1.5 min-w-0 truncate text-[13px] font-semibold text-bb-ink group-hover:text-bb-yellow transition-colors">
                          {c.name}
                        </p>
                        <p className="mt-1 font-mono text-[11px] tabular-nums text-bb-ink-faint">
                          {startDate.toLocaleDateString(undefined, { weekday: "short", day: "numeric", month: "short" })}
                          {" · "}
                          {startDate.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })}
                        </p>
                      </Panel>
                    </a>
                  );
                })}
              </div>
            </section>
          )}

          {/* Platform legend */}
          <div className="flex flex-wrap items-center gap-4">
            {Object.entries(PLATFORM_META).map(([key, meta]) => (
              <span key={key} className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.14em] text-bb-ink-faint">
                <span className="h-2 w-2 rounded-full" style={{ backgroundColor: meta.color }} />
                {meta.label}
              </span>
            ))}
          </div>
        </div>
      )}
    </DataState>
  );
};
