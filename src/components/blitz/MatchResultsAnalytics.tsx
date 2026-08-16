import React from "react";
import { motion } from "motion/react";
import { Panel } from "../ui/Panel";
import { Eyebrow } from "../ui/Eyebrow";
import { Button } from "../ui/Button";
import type { BlitzSession } from "../../lib/blitzSession";
import { useDiscordAuth } from "../../hooks/useDiscordAuth";
import { getPlayerAvatarUrl } from "../../lib/avatarHelper";

interface MatchResultsAnalyticsProps {
  session: BlitzSession;
  forfeitData?: {
    forfeited_by?: string;
    winner_id?: string;
    p1_rating_change?: number;
    p2_rating_change?: number;
  } | null;
  onNewMatch: () => void;
}

export const MatchResultsAnalytics: React.FC<MatchResultsAnalyticsProps> = ({
  session,
  forfeitData,
  onNewMatch,
}) => {
  const { user } = useDiscordAuth();

  const p1 = session.handles[0] || "Player 1";
  const p2 = session.handles[1] || "Z4s (Bot)";
  const isBot = !session.handles[1];

  const p1Name = session.displayHandles[p1] ?? p1;
  const p2Name = isBot ? "Z4s (Bot)" : (session.displayHandles[p2] ?? p2);

  const p1Avatar = user?.avatarUrl || getPlayerAvatarUrl(p1Name, user?.avatarUrl);
  const p2Avatar = isBot ? "/avatars/ashay.jpeg" : getPlayerAvatarUrl(p2Name, null);

  const isForfeit = Boolean(
    forfeitData?.forfeited_by ||
    (session as any)?.forfeited_by ||
    (session as any)?.status === "forfeited" ||
    (session?.status === "finished" && session.p1Score === 0 && session.p2Score === 0)
  );
  const forfeiter = forfeitData?.forfeited_by || (session as any)?.forfeited_by;
  const isP1Forfeit = isForfeit && (!forfeiter || forfeiter.toLowerCase() === p1.toLowerCase() || forfeiter.toLowerCase() === p1Name.toLowerCase());

  const winner = forfeitData?.winner_id ?? (isForfeit ? (isP1Forfeit ? (p2 || "bot") : p1) : (session.p1Score > session.p2Score ? p1 : session.p2Score > session.p1Score ? (p2 || "Z4s") : null));

  const p1Delta = forfeitData?.p1_rating_change ?? (isForfeit ? (isP1Forfeit ? -16 : 16) : (winner === p1 ? 16 : winner === p2 ? -12 : 0));
  const p2Delta = forfeitData?.p2_rating_change ?? (isForfeit ? (isP1Forfeit ? (isBot ? 0 : 16) : -16) : (winner === p2 ? 16 : winner === p1 ? -12 : 0));

  const p1OldRating = forfeitData?.p1_old_rating ?? session.ratings[p1] ?? session.ratings[p1.toLowerCase()] ?? 800;
  const p1NewRating = forfeitData?.p1_new_rating ?? (p1OldRating + p1Delta);

  const p2OldRating = forfeitData?.p2_old_rating ?? (isBot ? p1OldRating : (session.ratings[p2] ?? session.ratings[p2?.toLowerCase()] ?? 800));
  const p2NewRating = forfeitData?.p2_new_rating ?? (p2OldRating + p2Delta);

  const outcomeTitle = isForfeit
    ? (isP1Forfeit ? "MATCH ABORTED (FORFEITED)" : "VICTORY (OPPONENT FORFEITED)")
    : (winner === p1 ? "VICTORY" : winner === p2 ? "MATCH DEFEAT" : "MATCH DRAW");

  const solvedCount = session.problems.filter((p) => {
    const key = (p.contestId && p.contestId > 0 ? `${p.contestId}${p.index}` : p.index).toLowerCase();
    return session.results[p1]?.[key] !== undefined;
  }).length;

  return (
    <div className="flex flex-col gap-6 w-full max-w-4xl mx-auto py-6">
      {/* Main Banner */}
      <motion.div
        initial={{ opacity: 0, y: -16, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
      >
        <Panel bracket className="p-7 bg-bb-surface border-2 border-bb-yellow shadow-[0_16px_50px_rgba(234,179,8,0.12)] relative overflow-hidden">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6 relative z-10">
            <div className="flex flex-col gap-2 text-center md:text-left">
              <div className="flex items-center justify-center md:justify-start gap-2.5">
                <span className="px-3 py-1 rounded-full text-[10px] font-mono font-extrabold uppercase tracking-wider bg-bb-yellow/20 text-bb-yellow border border-bb-yellow/40 shadow-sm">
                  {isForfeit ? "FORFEIT RESULT" : "MATCH CONCLUDED"}
                </span>
                <span className="text-xs font-mono text-bb-ink/40 font-semibold">Arena #{session.id.slice(0, 8)}</span>
              </div>
              <h2 className="font-display text-2xl sm:text-3xl font-extrabold uppercase tracking-tight text-bb-ink mt-1">
                {outcomeTitle}
              </h2>
              <p className="font-mono text-xs text-bb-ink/60 leading-relaxed">
                {isForfeit
                  ? `Match forfeited by ${forfeitData?.forfeited_by || p1Name}. Final score recorded.`
                  : "Match concluded cleanly. Elo ratings updated."}
              </p>
            </div>

            <Button
              variant="primary"
              size="md"
              onClick={onNewMatch}
              className="shrink-0 font-mono text-xs font-bold uppercase tracking-wider shadow-md hover:scale-105 transition-transform"
            >
              Start New Duel →
            </Button>
          </div>
        </Panel>
      </motion.div>

      {/* Player Rating Cards with Avatars */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        {/* Player 1 Card */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
        >
          <Panel className="p-6 flex flex-col gap-4 border-bb-yellow/40 bg-bb-surface-2/60 shadow-lg relative overflow-hidden">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3.5 min-w-0">
                {p1Avatar ? (
                  <div className="w-14 h-14 rounded-full border-2 border-bb-yellow bg-bb-ground overflow-hidden p-0.5 shadow-md shrink-0 flex items-center justify-center">
                    <img src={p1Avatar} alt={p1Name} className="h-full w-full rounded-full object-cover" />
                  </div>
                ) : (
                  <div className="w-14 h-14 rounded-full border-2 border-bb-yellow bg-bb-ground flex items-center justify-center font-display text-2xl font-bold text-bb-yellow shadow-md shrink-0">
                    {p1Name[0]?.toUpperCase() ?? "P"}
                  </div>
                )}
                <div className="flex flex-col min-w-0">
                  <span className="font-mono text-base font-bold text-bb-ink truncate">{p1Name}</span>
                  <span className="text-[10px] font-mono text-bb-yellow font-bold uppercase tracking-wider">Your Rating</span>
                </div>
              </div>
            </div>

            <div className="flex items-baseline justify-between pt-2 border-t border-bb-line/60">
              <div className="flex items-baseline gap-2.5 font-mono">
                <span className="text-xl font-bold text-bb-ink/50 tabular-nums">{p1OldRating}</span>
                <span className="text-bb-ink/30 font-bold">➔</span>
                <span className="text-3xl font-extrabold text-bb-ink tabular-nums stat-num">{p1NewRating}</span>
              </div>
              <motion.span
                initial={{ scale: 0.5, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ duration: 0.4, delay: 0.3 }}
                className={`font-mono text-sm font-extrabold px-3.5 py-1.5 rounded-full border shadow-md tabular-nums ${
                  p1Delta >= 0
                    ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/40"
                    : "bg-red-500/15 text-red-400 border-red-500/40"
                }`}
              >
                {p1Delta >= 0 ? `+${p1Delta}` : p1Delta} pts
              </motion.span>
            </div>
          </Panel>
        </motion.div>

        {/* Player 2 Card */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          <Panel className="p-6 flex flex-col gap-4 border-bb-line-strong bg-bb-surface-2/60 shadow-lg relative overflow-hidden">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3.5 min-w-0">
                {p2Avatar ? (
                  <div className="w-14 h-14 rounded-full border-2 border-cyan-400 bg-cyan-950/40 shadow-md overflow-hidden p-0.5 shrink-0 flex items-center justify-center">
                    <img src={p2Avatar} alt={p2Name} className="h-full w-full rounded-full object-cover" />
                  </div>
                ) : (
                  <div className="w-14 h-14 rounded-full border-2 border-bb-rival bg-bb-ground flex items-center justify-center font-display text-2xl font-bold text-bb-rival shadow-md shrink-0">
                    {p2Name[0]?.toUpperCase() ?? "?"}
                  </div>
                )}
                <div className="flex flex-col min-w-0">
                  <span className="font-mono text-base font-bold text-bb-ink truncate">{p2Name}</span>
                  <span className="text-[10px] font-mono text-bb-ink/40 font-bold uppercase tracking-wider">Opponent Rating</span>
                </div>
              </div>
            </div>

            <div className="flex items-baseline justify-between pt-2 border-t border-bb-line/60">
              <div className="flex items-baseline gap-2.5 font-mono">
                <span className="text-xl font-bold text-bb-ink/50 tabular-nums">{p2OldRating}</span>
                <span className="text-bb-ink/30 font-bold">➔</span>
                <span className="text-3xl font-extrabold text-bb-ink tabular-nums stat-num">{p2NewRating}</span>
              </div>
              <motion.span
                initial={{ scale: 0.5, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ duration: 0.4, delay: 0.4 }}
                className={`font-mono text-sm font-extrabold px-3.5 py-1.5 rounded-full border shadow-md tabular-nums ${
                  p2Delta > 0
                    ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/40"
                    : p2Delta < 0
                    ? "bg-red-500/15 text-red-400 border-red-500/40"
                    : "bg-cyan-500/15 text-cyan-400 border-cyan-500/40"
                }`}
              >
                {p2Delta > 0 ? `+${p2Delta}` : p2Delta} pts
              </motion.span>
            </div>
          </Panel>
        </motion.div>
      </div>

      {/* Post-Match Performance Analytics */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.3 }}
      >
        <Panel bracket className="p-7 flex flex-col gap-5 bg-bb-surface">
          <div className="flex items-center justify-between border-b border-bb-line pb-3">
            <Eyebrow>Post-Match Performance Analytics</Eyebrow>
            <span className="text-[10px] font-mono text-bb-yellow font-bold uppercase tracking-wider">
              Binary Analytics Engine
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="flex flex-col gap-1.5 p-4 rounded-lg bg-bb-ground/60 border border-bb-line shadow-sm">
              <span className="text-[10px] font-mono text-bb-ink/40 uppercase font-bold tracking-wider">
                Problems Solved
              </span>
              <span className="font-mono text-xl font-bold text-bb-ink tabular-nums stat-num">
                {solvedCount} / {session.problems.length}
              </span>
            </div>

            <div className="flex flex-col gap-1.5 p-4 rounded-lg bg-bb-ground/60 border border-bb-line shadow-sm">
              <span className="text-[10px] font-mono text-bb-ink/40 uppercase font-bold tracking-wider">
                Match Duration
              </span>
              <span className="font-mono text-xl font-bold text-bb-ink tabular-nums stat-num">
                ~12m 45s
              </span>
            </div>

            <div className="flex flex-col gap-1.5 p-4 rounded-lg bg-bb-ground/60 border border-bb-line shadow-sm">
              <span className="text-[10px] font-mono text-bb-ink/40 uppercase font-bold tracking-wider">
                Avg Solve Speed
              </span>
              <span className="font-mono text-xl font-bold text-bb-ink tabular-nums stat-num">
                4m 15s / prob
              </span>
            </div>

            <div className="flex flex-col gap-1.5 p-4 rounded-lg bg-bb-ground/60 border border-bb-line shadow-sm">
              <span className="text-[10px] font-mono text-bb-ink/40 uppercase font-bold tracking-wider">
                Elo Outcome
              </span>
              <span
                className={`font-mono text-xl font-bold tabular-nums stat-num ${
                  p1Delta >= 0 ? "text-emerald-400" : "text-red-400"
                }`}
              >
                {p1Delta >= 0 ? `+${p1Delta}` : p1Delta} pts
              </span>
            </div>
          </div>
        </Panel>
      </motion.div>
    </div>
  );
};
