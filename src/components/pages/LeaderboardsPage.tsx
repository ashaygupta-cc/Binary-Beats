import React, { useMemo, useState } from "react";
import { botApi, type PointsEntry, type RatingEntry } from "../../lib/botApi";
import { useBotData } from "../../hooks/useBotData";
import { BOARDS, type BoardDef } from "../../data/site";
import { navigate } from "../../lib/router";
import { PageHeader, PageBody, DataState, SkeletonRows, EmptyState } from "../ui/PageShell";
import { Panel } from "../ui/Panel";
import { Button } from "../ui/Button";
import { Tag } from "../ui/Tag";

const PAGE_SIZE = 25;

interface Props {
  /** Board id from the route, e.g. #/leaderboards/cp-duel */
  boardId?: string;
  currentDiscordId?: string | null;
  playSound?: (t: "click" | "hover") => void;
}

/** Either board shape — both expose `entries`, which is all this page needs. */
type BoardPayload = { entries: (PointsEntry | RatingEntry)[] };

type Row = {
  rank: number;
  discord_id: string;
  name: string;
  primary: number;
  secondaryLabel: string;
  secondary: string;
};

function toRows(board: BoardDef, data: BoardPayload): Row[] {
  return data.entries.map((e) => {
    if (board.kind === "points") {
      const p = e as PointsEntry;
      return {
        rank: p.rank,
        discord_id: p.discord_id,
        name: p.discord_username,
        primary: p.points,
        secondaryLabel: "solved",
        secondary: String(p.solved),
      };
    }
    const r = e as RatingEntry;
    return {
      rank: r.rank,
      discord_id: r.discord_id,
      name: r.discord_username,
      primary: r.rating,
      secondaryLabel: "W/L/D",
      secondary: `${r.wins}/${r.losses}/${r.draws}`,
    };
  });
}

export const LeaderboardsPage: React.FC<Props> = ({ boardId, currentDiscordId, playSound }) => {
  const board = BOARDS.find((b) => b.id === boardId) ?? BOARDS[0];
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);

  const { data, state, error, reload } = useBotData<BoardPayload>(
    () =>
      board.kind === "points"
        ? botApi.pointsBoard(board.param, 500)
        : botApi.ratingBoard(board.param, 500),
    [board.id]
  );

  const rows = useMemo(() => (data ? toRows(board, data) : []), [data, board]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r) => r.name.toLowerCase().includes(q));
  }, [rows, search]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, pageCount - 1);
  const visible = filtered.slice(safePage * PAGE_SIZE, safePage * PAGE_SIZE + PAGE_SIZE);

  const selectBoard = (id: string) => {
    playSound?.("click");
    setPage(0);
    setSearch("");
    navigate(`leaderboards/${id}`);
  };

  return (
    <div className="flex flex-1 flex-col">
      <PageHeader
        number="03"
        title="Leaderboards"
        blurb="Rankings are never merged. Every category keeps its own board, straight from the bot."
      />

      <PageBody className="flex flex-col gap-5">
        {/* Board switcher — horizontal scroll on mobile instead of wrapping
            into a tall stack that pushes the table off screen. */}
        <div className="-mx-4 overflow-x-auto px-4 pb-1 sm:mx-0 sm:px-0 no-scrollbar">
          <div className="flex w-max min-w-full gap-2">
            {BOARDS.map((b) => {
              const active = b.id === board.id;
              return (
                <button
                  key={b.id}
                  onClick={() => selectBoard(b.id)}
                  onMouseEnter={() => playSound?.("hover")}
                  aria-current={active ? "page" : undefined}
                  className={`shrink-0 rounded border-[1.5px] px-3 py-2 font-mono text-[11px] font-bold uppercase tracking-wider transition-colors cursor-pointer ${
                    active
                      ? "border-bb-border-hard bg-bb-yellow text-bb-ground"
                      : "border-bb-line-strong text-bb-ink-soft hover:border-bb-ink hover:text-bb-ink"
                  }`}
                >
                  {b.label}
                </button>
              );
            })}
          </div>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-[13px] text-bb-ink-soft">{board.blurb}</p>
          <label className="relative w-full sm:w-64">
            <span className="sr-only">Search members</span>
            <input
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(0);
              }}
              placeholder="Search member…"
              className="h-9 w-full rounded border-[1.5px] border-bb-line-strong bg-bb-surface px-3 font-mono text-[12px] text-bb-ink placeholder:text-bb-ink-faint focus:border-bb-yellow focus:outline-none"
            />
          </label>
        </div>

        <DataState
          state={state}
          error={error}
          data={data}
          onRetry={reload}
          skeleton={<SkeletonRows rows={8} />}
          isEmpty={() => rows.length === 0}
          empty={
            <EmptyState
              title="No entries yet"
              body="This board fills up as members solve and duel on Discord."
            />
          }
        >
          {() =>
            filtered.length === 0 ? (
              <EmptyState title="No match" body={`Nobody matching “${search}” on this board.`} />
            ) : (
              <>
                {/* Column header — hidden on mobile where the card layout
                    already labels each value inline. */}
                <div className="hidden grid-cols-[4rem_1fr_8rem_8rem] gap-3 px-4 pb-1 font-mono text-[10px] uppercase tracking-[0.18em] text-bb-ink-faint sm:grid">
                  <span>Rank</span>
                  <span>Member</span>
                  <span className="text-right">{board.kind === "points" ? "Points" : "Rating"}</span>
                  <span className="text-right">{board.kind === "points" ? "Solved" : "W/L/D"}</span>
                </div>

                <ul className="flex flex-col gap-2">
                  {visible.map((r) => {
                    const isMe = currentDiscordId && r.discord_id === currentDiscordId;
                    return (
                      <li key={r.discord_id}>
                        <Panel
                          lift
                          role="button"
                          tabIndex={0}
                          onClick={() => {
                            playSound?.("click");
                            navigate(`u/${r.discord_id}`);
                          }}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") navigate(`u/${r.discord_id}`);
                          }}
                          className={`grid cursor-pointer grid-cols-[3rem_1fr] items-center gap-3 p-3 sm:grid-cols-[4rem_1fr_8rem_8rem] sm:p-4 ${
                            isMe ? "border-bb-yellow" : ""
                          }`}
                        >
                          <span
                            className={`font-hud text-lg font-bold tabular-nums sm:text-2xl ${
                              r.rank <= 3 ? "text-bb-yellow" : "text-bb-ink-faint"
                            }`}
                          >
                            {String(r.rank).padStart(2, "0")}
                          </span>

                          <span className="flex min-w-0 flex-col">
                            <span className="truncate text-[14px] font-semibold text-bb-ink">
                              {r.name}
                              {isMe && (
                                <Tag tone="accent" className="ml-2 align-middle">
                                  You
                                </Tag>
                              )}
                            </span>
                            {/* Mobile-only inline values */}
                            <span className="mt-0.5 font-mono text-[11px] text-bb-ink-soft sm:hidden">
                              {r.primary} {board.kind === "points" ? "pts" : "rating"} ·{" "}
                              {r.secondary} {r.secondaryLabel}
                            </span>
                          </span>

                          <span className="hidden text-right font-hud text-lg font-bold tabular-nums text-bb-ink sm:block">
                            {r.primary}
                          </span>
                          <span className="hidden text-right font-mono text-[12px] tabular-nums text-bb-ink-soft sm:block">
                            {r.secondary}
                          </span>
                        </Panel>
                      </li>
                    );
                  })}
                </ul>

                {pageCount > 1 && (
                  <div className="flex items-center justify-between gap-3 pt-2">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={safePage === 0}
                      onClick={() => {
                        playSound?.("click");
                        setPage((p) => Math.max(0, p - 1));
                      }}
                    >
                      Prev
                    </Button>
                    <span className="font-mono text-[11px] uppercase tracking-[0.18em] text-bb-ink-faint">
                      {safePage + 1} / {pageCount}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={safePage >= pageCount - 1}
                      onClick={() => {
                        playSound?.("click");
                        setPage((p) => Math.min(pageCount - 1, p + 1));
                      }}
                    >
                      Next
                    </Button>
                  </div>
                )}
              </>
            )
          }
        </DataState>
      </PageBody>
    </div>
  );
};
