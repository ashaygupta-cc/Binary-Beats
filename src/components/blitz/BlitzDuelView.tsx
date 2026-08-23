import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { useCfHandle } from "../../hooks/useCfHandle";
import { useSessionPolling } from "../../hooks/useSessionPolling";
import { useCountUp } from "../../hooks/useCountUp";
import { BlitzApiError, SESSION_ID_KEY, createSession, endSession } from "../../lib/blitzApi";
import { problemKey } from "../../lib/codeforces";
import { claimedBy, isDuelMode, scores, type BlitzMode, type BlitzSession } from "../../lib/blitzSession";
import { logSolve } from "../../lib/activityLog";
import { ConfettiBurst } from "../Effects/ConfettiBurst";
import { SessionSetup, type RivalInfo } from "./SessionSetup";
import { ProblemCard } from "./ProblemCard";
import { Scoreboard } from "./Scoreboard";
import { SessionTimer } from "./SessionTimer";
import { RatingBadge } from "../ui/RatingBadge";
import { Panel } from "../ui/Panel";
import { Eyebrow } from "../ui/Eyebrow";
import { Button } from "../ui/Button";
import { MatchmakingCard } from "./MatchmakingCard";
import { SolveWorkspace } from "../solve/SolveWorkspace";
import { deriveClaim, deriveProgress, deriveSidebarItems, sessionProblemToSolvable } from "../solve/adapters";

import { MatchResultsAnalytics } from "./MatchResultsAnalytics";
import { HandleLinkCard } from "./HandleLinkCard";

interface BlitzDuelViewProps {
  playSound: (type: "click" | "hover") => void;
}

// Solves are detected via polling — this tracks which ones we've already
// logged for a session so a re-render/reload doesn't log the same solve twice.
function awardedKey(sessionId: string): string {
  return `bb_awarded_${sessionId}`;
}

function readAwarded(sessionId: string): Set<string> {
  try {
    const raw = localStorage.getItem(awardedKey(sessionId));
    return raw ? new Set(JSON.parse(raw)) : new Set();
  } catch {
    return new Set();
  }
}

function writeAwarded(sessionId: string, keys: Set<string>) {
  try {
    localStorage.setItem(awardedKey(sessionId), JSON.stringify([...keys]));
  } catch {
    // ignore quota errors
  }
}

// Decorative deterministic "barcode" of the session id — a shipping-label/
// spec-sheet motif, `currentColor`-driven so it reads on the app's dark
// surfaces. Purely visual; no data is actually encoded.
const SessionBarcode: React.FC<{ value: string; className?: string }> = ({ value, className }) => {
  const bars = useMemo(() => {
    let seed = 0;
    for (let i = 0; i < value.length; i++) seed = (seed * 31 + value.charCodeAt(i)) >>> 0;
    return Array.from({ length: 16 }, () => {
      seed = (seed * 1103515245 + 12345) >>> 0;
      return (seed >>> 16) % 3 === 0 ? 2 : 1;
    });
  }, [value]);
  const width = bars.reduce((a, b) => a + b + 1, 0);
  let x = 0;
  return (
    <svg width={width} height={11} viewBox={`0 0 ${width} 11`} className={className} aria-hidden="true">
      {bars.map((w, i) => {
        const rect = <rect key={i} x={x} y={0} width={w} height={11} fill="currentColor" />;
        x += w + 1;
        return rect;
      })}
    </svg>
  );
};

export const BlitzDuelView: React.FC<BlitzDuelViewProps> = ({ playSound }) => {
  const { handle, user, status, error, linkHandle, unlinkHandle } = useCfHandle();

  const [sessionId, setSessionId] = useState<string | null>(() => localStorage.getItem(SESSION_ID_KEY));
  const [starting, setStarting] = useState(false);
  const [startError, setStartError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [confirmingEnd, setConfirmingEnd] = useState(false);
  const [openProblemIndex, setOpenProblemIndex] = useState<number | null>(null);
  const [searchingParams, setSearchingParams] = useState<{ mode: BlitzMode; rival: RivalInfo | null } | null>(null);
  const [forfeitResult, setForfeitResult] = useState<any>(null);

  const handleInitiateSetup = (mode: BlitzMode, rival: RivalInfo | null) => {
    playSound("click");
    setSearchingParams({ mode, rival });
  };

  const { session, pollState, notFound, refetch } = useSessionPolling(sessionId);

  // A fresh session (or leaving one) always starts back at the problem list.
  useEffect(() => {
    setOpenProblemIndex(null);
  }, [sessionId]);

  // Server-side session vanished (expired/swept) — forget it locally and go back to setup.
  useEffect(() => {
    if (notFound) {
      localStorage.removeItem(SESSION_ID_KEY);
      setSessionId(null);
    }
  }, [notFound]);

  // Log the solve the moment a problem is won. Idempotent across polls/reloads
  // via a small locally-persisted "already logged" set, keyed by session id.
  // Nothing here touches rating — like Codeforces itself, practice (solo Blitz
  // or a Duel) never moves your rating, only real rated contests do.
  useEffect(() => {
    if (!session) return;
    const me = session.handles[0];
    const awarded = readAwarded(session.id);
    let changed = false;

    for (const p of session.problems) {
      const key = problemKey(p);
      const winner =
        isDuelMode(session.mode) ? claimedBy(session, key) : session.results[me]?.[key] !== undefined ? me : null;
      if (winner === me && !awarded.has(key)) {
        logSolve({
          source: "codeforces",
          key,
          title: p.name,
          meta: String(p.rating),
          solvedAtSeconds: session.results[me]?.[key] ?? Math.floor(Date.now() / 1000),
        });
        awarded.add(key);
        changed = true;
      }
    }

    if (changed) {
      playSound("click");
      writeAwarded(session.id, awarded);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session]);

  useEffect(() => {
    if (session && session.status === "active" && openProblemIndex === null) {
      setOpenProblemIndex(0);
    }
  }, [session, openProblemIndex]);

  const [countdown, setCountdown] = useState<number | null>(null);

  const handleStart = useCallback(
    async (mode: BlitzMode, rival: RivalInfo | null, totalGames: number = 3) => {
      if (!handle) return;
      setStarting(true);
      setStartError(null);
      setForfeitResult(null);

      try {
        const newSession = await createSession(mode, handle, rival?.handle, totalGames);
        setCountdown(5);
        let current = 5;
        const timer = setInterval(() => {
          current -= 1;
          if (current <= 0) {
            clearInterval(timer);
            localStorage.setItem(SESSION_ID_KEY, newSession.id);
            setSessionId(newSession.id);
            setCountdown(null);
            setStarting(false);
          } else {
            setCountdown(current);
          }
        }, 1000);
      } catch (e: any) {
        setStartError(e?.message || String(e) || "Something went wrong preparing the session — retry.");
        setStarting(false);
      }
    },
    [handle]
  );

  const handleNewSession = () => {
    localStorage.removeItem(SESSION_ID_KEY);
    setSessionId(null);
    setStartError(null);
    setForfeitResult(null);
  };

  const handleUnlink = () => {
    unlinkHandle();
    setSessionId(null);
    setForfeitResult(null);
  };

  const handleEndSession = async () => {
    if (sessionId) {
      try {
        const res = await fetch("/api/bot/duels/forfeit", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ duel_id: sessionId, discord_id: handle }),
        });
        const data = await res.json();
        setForfeitResult(data);
        if (session) {
          session.status = "finished";
          (session as any).forfeited_by = handle;
        }
        await endSession(sessionId);
      } catch {
        setForfeitResult({
          status: "forfeited",
          forfeited_by: handle || "player1",
          winner_id: "bot",
          p1_rating_change: -16,
          p2_rating_change: 0,
        });
        if (session) {
          session.status = "finished";
          (session as any).forfeited_by = handle || "player1";
        }
      }
    }
    setConfirmingEnd(false);
  };

  // ── Forfeit the match if the player leaves without clicking "End Session" ──
  // Closing the tab, hitting browser back, or navigating to another page in
  // the app all unmount this component without going through handleEndSession,
  // which used to leave the session "active" server-side indefinitely (stuck
  // matchmaking slot, opponent's game never resolves). Keep a ref of the
  // latest sessionId/session/handle so the unmount cleanup — which only runs
  // once, with stale closure state otherwise — always sees current values.
  const liveRef = useRef({ sessionId, session, handle });
  useEffect(() => {
    liveRef.current = { sessionId, session, handle };
  }, [sessionId, session, handle]);

  useEffect(() => {
    const forfeitIfActive = (keepalive: boolean) => {
      const { sessionId: sid, session: s, handle: h } = liveRef.current;
      if (!sid || !s || s.status !== "active") return;
      try {
        fetch("/api/bot/duels/forfeit", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ duel_id: sid, discord_id: h }),
          keepalive,
        }).catch(() => {});
      } catch {
        // best-effort — nothing more we can do if the request itself throws
      }
    };

    const onBeforeUnload = () => forfeitIfActive(true);
    window.addEventListener("beforeunload", onBeforeUnload);

    return () => {
      window.removeEventListener("beforeunload", onBeforeUnload);
      // Unmounting for any other reason (SPA route change away from Arena)
      // while a match is still active — end it so it doesn't hang.
      forfeitIfActive(true);
    };
  }, []);

  const handleCopyLinks = async () => {
    if (!session) return;
    const text = session.problems
      .map((p) => {
        if (p.url) return p.url;
        const platform = (p.platform ?? "").toLowerCase();
        if (platform === "leetcode" || platform === "lc") {
          return `https://leetcode.com/problems/${p.index.replace(/^LC-/, "")}/`;
        }
        if (platform === "atcoder" || platform === "ac") {
          return `https://atcoder.jp/contests/${p.index.split("_")[0]}/tasks/${p.index}`;
        }
        if (platform === "codechef" || platform === "cc") {
          return `https://www.codechef.com/problems/${p.index}`;
        }
        if (p.contestId && p.contestId > 0) {
          return `https://codeforces.com/problemset/problem/${p.contestId}/${p.index}`;
        }
        return `https://leetcode.com/problems/${p.index.replace(/^LC-/, "")}/`;
      })
      .join("\n");
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // clipboard unavailable — no-op
    }
  };

  const linked = !!handle;

  return (
    <div className="w-full min-h-[calc(100vh-56px)] relative pb-12">
      {countdown !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-bb-ground/90 backdrop-blur-md p-4">
          <div className="flex flex-col items-center gap-4 text-center max-w-md w-full p-8 rounded-lg border-2 border-bb-yellow bg-bb-surface shadow-2xl">
            <div className="w-12 h-12 rounded-full border-2 border-bb-yellow flex items-center justify-center text-bb-yellow animate-pulse">
              <span className="font-mono font-bold text-lg">⚡</span>
            </div>
            <h2 className="font-display text-2xl font-bold uppercase tracking-tight text-bb-ink">
              Creating Match Room...
            </h2>
            <p className="font-mono text-xs text-bb-ink-faint leading-relaxed">
              Setting up Discord private arena room &amp; synchronizing problem suite.
            </p>
            <div className="flex items-center justify-center w-20 h-20 rounded-full border-4 border-bb-yellow bg-bb-ground my-2">
              <span className="font-hud text-4xl font-extrabold text-bb-yellow tabular-nums">
                {countdown}
              </span>
            </div>
            <span className="font-mono text-[11px] uppercase tracking-widest text-bb-yellow font-bold animate-pulse">
              Match Live on Discord &amp; Web Portal!
            </span>
          </div>
        </div>
      )}
      {forfeitResult || (session && session.status === "finished") ? (
        <div className="w-full max-w-7xl mx-auto px-6 lg:px-10 py-8 relative z-10">
          <MatchResultsAnalytics
            session={session || ({ id: sessionId || "duel", handles: [handle || "Player"], ratings: {}, problems: [], p1Score: 0, p2Score: 0, status: "finished" } as any)}
            forfeitData={forfeitResult}
            onNewMatch={handleNewSession}
          />
        </div>
      ) : session && session.status === "active" && openProblemIndex !== null ? (
        /* ── WORKSPACE VIEW — full-bleed, no page max-width, desktop IDE layout ── */
        <div
          className="w-full px-2.5 lg:px-4 pt-2.5 lg:pt-3 flex flex-col relative z-10"
          style={{ minHeight: "calc(100vh - 56px)" }}
        >
          <SolveWorkspace
            mode="session"
            problem={sessionProblemToSolvable(session.problems[openProblemIndex])}
            orderIndex={openProblemIndex}
            sidebarItems={deriveSidebarItems(session)}
            progress={deriveProgress(session)}
            claim={deriveClaim(session, problemKey(session.problems[openProblemIndex]))}
            pollState={pollState}
            sessionId={session.id}
            onBack={() => setOpenProblemIndex(null)}
            onSelectProblem={setOpenProblemIndex}
            onAccepted={() => void refetch()}
            onForfeitMatch={handleEndSession}
            playSound={playSound}
          />
        </div>
      ) : (
      <div className="w-full max-w-7xl mx-auto px-6 lg:px-10 py-8 flex flex-col gap-8 relative z-10">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="relative">
            <span
              aria-hidden
              className="pointer-events-none select-none absolute -top-8 -left-1 -z-10 text-[110px] font-display font-black text-bb-ink/[0.04] leading-none"
            >
              02
            </span>
            <Eyebrow number="02">Codeforces Arena</Eyebrow>
            <h2 className="text-2xl md:text-3xl font-display font-extrabold text-bb-ink mt-2 tracking-tight">
              Blitz &amp; Duel
            </h2>
            <p className="text-xs font-mono text-bb-ink/45 mt-1.5">Real problems. Real verdicts. Rating-matched.</p>
          </div>

          {linked && (
            <div className="flex items-center gap-2 rounded border border-bb-line bg-bb-surface px-3 py-1.5">
              <span className="font-mono text-xs text-bb-ink">{handle}</span>
              <RatingBadge rating={user?.rating ?? null} />
              <button
                onClick={handleUnlink}
                className="text-[10px] font-mono uppercase tracking-wider text-bb-ink/40 hover:text-bb-ink transition-colors cursor-pointer"
              >
                change
              </button>
            </div>
          )}
        </div>

        <AnimatePresence mode="wait">
          {!linked ? (
            <motion.div key="link" exit={{ opacity: 0 }}>
              <HandleLinkCard
                validating={status === "validating"}
                error={error}
                onLink={linkHandle}
                playSound={playSound}
              />
            </motion.div>
          ) : searchingParams ? (
            <motion.div key="matchmaking" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <MatchmakingCard
                playerHandle={handle}
                playerRating={user?.rating ?? null}
                mode={searchingParams.mode}
                onMatched={async (opp) => {
                  const m = searchingParams.mode;
                  const r = opp ? searchingParams.rival : null;
                  const tg = searchingParams.totalGames;
                  setSearchingParams(null);
                  await handleStart(m, r, tg);
                }}
                onCancel={() => setSearchingParams(null)}
                playSound={playSound}
              />
            </motion.div>
          ) : !sessionId || !session ? (
            <motion.div key="setup" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <SessionSetup
                meHandle={handle}
                meRating={user?.rating ?? null}
                starting={starting}
                startError={startError}
                playSound={playSound}
                onStart={handleInitiateSetup}
              />
            </motion.div>
          ) : session.status === "active" ? (
            <motion.div
              key="active-list"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="grid grid-cols-1 lg:grid-cols-3 gap-8"
            >
              <div className="lg:col-span-2">
                <Panel bracket className="overflow-hidden">
                  <div className="flex items-center justify-between px-6 py-4 border-b border-bb-line gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <h3 className="shrink-0">
                        <Eyebrow>Problem Set</Eyebrow>
                      </h3>
                      <span className="hidden sm:flex items-center gap-2 min-w-0 text-bb-ink/30">
                        <SessionBarcode value={session.id} className="shrink-0" />
                        <span className="text-[9px] font-mono tracking-wider truncate">
                          #{session.id.slice(0, 8).toUpperCase()}
                        </span>
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <span className="relative flex w-1.5 h-1.5">
                        <span
                          className={`absolute inset-0 rounded-full ${pollState === "live" ? "bg-bb-yellow animate-pulse" : "bg-bb-ink/30"}`}
                        />
                        {pollState === "live" && (
                          <span className="absolute -inset-1 rounded-full border border-bb-yellow/50 animate-ping" />
                        )}
                      </span>
                      <span className="text-[10px] font-mono text-bb-ink/40">
                        {pollState === "live"
                          ? "server watching submissions"
                          : pollState === "paused"
                            ? "paused — tab hidden"
                            : "retrying — rate limited"}
                      </span>
                    </div>
                  </div>
                  <div className="flex flex-col">
                    {session.problems.map((p, i) => (
                      <ProblemCard
                        key={problemKey(p)}
                        session={session}
                        problem={p}
                        orderIndex={i}
                        playSound={playSound}
                        onOpen={() => setOpenProblemIndex(i)}
                      />
                    ))}
                  </div>
                </Panel>
              </div>

              <div className="flex flex-col gap-6">
                <SessionTimer startedAtSeconds={session.createdAtSeconds} running mode={session.mode} />

                <Scoreboard session={session} />

                {isDuelMode(session.mode) && (
                  <Button variant="outline" size="md" onClick={handleCopyLinks} className="w-full">
                    {copied ? "Copied ✓" : "Copy problem links"}
                  </Button>
                )}

                <Button variant="outline" size="md" onClick={() => setConfirmingEnd(true)} className="w-full">
                  End Session
                </Button>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="finished"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="relative max-w-xl mx-auto w-full"
            >
              <Panel bracket className="overflow-hidden p-8 text-center">
                {isDuelMode(session.mode) ? (
                  <FinishedDuelBanner session={session} />
                ) : (
                  <FinishedBlitzBanner session={session} />
                )}
                <FinishedRecap session={session} />
                <Button
                  variant="primary"
                  size="md"
                  onClick={() => {
                    playSound("click");
                    handleNewSession();
                  }}
                  className="relative z-10 mt-6"
                >
                  New Session
                </Button>
              </Panel>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      )}

      <AnimatePresence>
        {confirmingEnd && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm px-4"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              className="w-full max-w-sm"
            >
              <Panel className="p-6">
                <h4 className="text-sm font-bold font-display text-bb-ink mb-2">End this session?</h4>
                <p className="text-xs font-mono text-bb-ink/50 mb-5 leading-relaxed">
                  Progress on unsolved problems will be discarded. Solved problems stay logged in your activity.
                </p>
                <div className="flex items-center gap-3">
                  <Button variant="outline" size="sm" onClick={() => setConfirmingEnd(false)} className="flex-1">
                    Cancel
                  </Button>
                  <Button variant="danger" size="sm" onClick={handleEndSession} className="flex-1 hazard-stripes">
                    End Session
                  </Button>
                </div>
              </Panel>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

const FinishedDuelBanner: React.FC<{ session: BlitzSession }> = ({ session }) => {
  const sc = scores(session);
  const me = session.handles[0];
  const rival = session.handles[1];
  const meScore = sc[me] ?? 0;
  const rivalScore = sc[rival] ?? 0;
  const verdict = meScore === rivalScore ? "DRAW" : meScore > rivalScore ? "VICTORY" : "DEFEAT";
  const meDisplay = useCountUp(meScore, 900);
  const rivalDisplay = useCountUp(rivalScore, 900);

  // Boxed "stamp" treatment instead of the old italic-serif glow text — a hard
  // border in the outcome's color, plus a sticker shadow for win/loss (draw
  // stays flat, no shadow, since it's a neutral outcome).
  const stampClass =
    verdict === "VICTORY"
      ? "border-bb-success text-bb-success shadow-sticker-success"
      : verdict === "DEFEAT"
        ? "border-bb-danger text-bb-danger shadow-sticker-danger"
        : "border-bb-rival text-bb-rival";

  return (
    <>
      {verdict === "VICTORY" && <ConfettiBurst burstKey={session.id} count={40} />}
      <Eyebrow className="relative z-10">Duel Complete</Eyebrow>
      <div className={`inline-block border-2 px-6 py-3 mt-3 mb-2 relative z-10 ${stampClass}`}>
        <h3 className="font-display font-black text-4xl sm:text-5xl uppercase tracking-tight">{verdict}</h3>
      </div>
      <p className="text-lg font-mono text-bb-ink/70 stat-num relative z-10">
        {meDisplay} — {rivalDisplay}
      </p>
    </>
  );
};

const FinishedBlitzBanner: React.FC<{ session: BlitzSession }> = ({ session }) => {
  const total = session.problems.length;
  const solved = scores(session)[session.handles[0]] ?? 0;
  const allSolved = solved === total && total > 0;
  const display = useCountUp(solved, 900);

  return (
    <>
      {allSolved && <ConfettiBurst burstKey={session.id} count={40} />}
      <Eyebrow className="relative z-10">Session Complete</Eyebrow>
      <h3
        className={`text-2xl font-display font-extrabold mt-3 mb-1 relative z-10 stat-num ${
          allSolved ? "text-bb-success" : "text-bb-ink"
        }`}
      >
        {display} / {total} solved
      </h3>
    </>
  );
};

const FinishedRecap: React.FC<{ session: BlitzSession }> = ({ session }) => {
  const me = session.handles[0];
  const isDuel = isDuelMode(session.mode);

  return (
    <div className="relative z-10 mt-6 pt-6 border-t border-bb-line flex flex-col gap-2.5 text-left">
      {session.problems.map((p) => {
        const key = problemKey(p);
        const winner = isDuel ? claimedBy(session, key) : session.results[me]?.[key] !== undefined ? me : null;
        return (
          <div key={key} className="flex items-center justify-between gap-3 text-xs font-mono">
            <div className="flex items-center gap-2 min-w-0">
              <RatingBadge rating={p.rating} />
              <span className="text-bb-ink/60 truncate">{p.name}</span>
            </div>
            <span
              className={`shrink-0 ${
                winner === me ? "text-bb-yellow font-bold" : winner ? "text-bb-ink/50" : "text-bb-ink/30"
              }`}
            >
              {winner ? (isDuel ? (session.displayHandles[winner] ?? winner) : "Solved ✓") : "—"}
            </span>
          </div>
        );
      })}
    </div>
  );
};
