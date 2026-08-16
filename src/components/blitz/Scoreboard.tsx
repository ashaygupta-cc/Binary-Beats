import React from "react";
import { motion } from "motion/react";
import { scores, type BlitzSession } from "../../lib/blitzSession";
import { Panel } from "../ui/Panel";
import { Eyebrow } from "../ui/Eyebrow";
import { StatNumeral } from "../ui/StatNumeral";
import { useDiscordAuth } from "../../hooks/useDiscordAuth";
import { getPlayerAvatarUrl } from "../../lib/avatarHelper";

interface ScoreboardProps {
  session: BlitzSession;
}

const Avatar: React.FC<{ letter: string; className?: string }> = ({ letter, className = "" }) => (
  <div
    className={`w-9 h-9 rounded-full bg-bb-ground border border-bb-line flex items-center justify-center text-xs font-mono font-bold shrink-0 shadow-sm ${className}`}
  >
    {letter}
  </div>
);

export const Scoreboard: React.FC<ScoreboardProps> = ({ session }) => {
  const { user } = useDiscordAuth();
  const s = scores(session);
  const me = session.handles[0] || "Player";
  const total = session.problems.length;
  const rival = session.handles[1];

  const meScore = s[me] ?? 0;
  const rivalScore = rival ? (s[rival] ?? 0) : (session.results?.["cp_bot_ai"] ? 1 : 0);
  const isVsBot = !rival;
  const rivalName = rival ? (session.displayHandles[rival] ?? rival) : "Z4s";
  const leading = meScore === rivalScore ? null : meScore > rivalScore ? me : (rival || "bot");

  const meAvatar = user?.avatarUrl || getPlayerAvatarUrl(me, user?.avatarUrl);
  const rivalAvatar = rival ? getPlayerAvatarUrl(rival, null) : "/avatars/ashay.jpeg";

  return (
    <Panel bracket className="p-5 flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <Eyebrow>1v1 Battle Scoreboard</Eyebrow>
        <span className="text-[10px] font-mono px-2.5 py-0.5 rounded-full border border-bb-yellow/40 bg-bb-yellow/15 text-bb-yellow uppercase tracking-wider font-bold">
          {isVsBot ? "Solo vs Z4s" : "1v1 Live Battle"}
        </span>
      </div>

      {/* Player 1 Card */}
      <div className="flex items-center justify-between bg-bb-surface-2/80 p-3 rounded-lg border border-bb-line">
        <div className="flex items-center gap-2.5 min-w-0">
          {meAvatar ? (
            <div className="w-9 h-9 rounded-full border border-bb-yellow/60 bg-bb-yellow/10 flex items-center justify-center shrink-0 overflow-hidden p-0.5 shadow-sm">
              <img src={meAvatar} alt={me} className="h-full w-full rounded-full object-cover" />
            </div>
          ) : (
            <Avatar
              letter={me[0]?.toUpperCase() ?? "P"}
              className={leading === me ? "text-bb-yellow border-bb-yellow/60 bg-bb-yellow/10" : "text-bb-ink/60"}
            />
          )}
          <div className="flex flex-col min-w-0">
            <span className="text-xs font-mono font-bold text-bb-ink truncate">{session.displayHandles[me] ?? me}</span>
            <span className="text-[10px] font-mono text-bb-ink/50">Rating: {session.ratings[me] ?? 1200}</span>
          </div>
        </div>
        <StatNumeral
          value={meScore}
          countUp
          size="md"
          className={`tabular-nums shrink-0 font-bold ${leading === me ? "text-bb-yellow" : "text-bb-ink"}`}
        />
      </div>

      {/* Tug of war progress bar */}
      <div className="relative h-3 rounded-md bg-bb-ink/10 overflow-hidden">
        <motion.div
          className="absolute left-0 top-0 h-full bg-bb-yellow"
          initial={{ width: 0 }}
          animate={{ width: total > 0 ? `${(meScore / total) * 100}%` : 0 }}
          transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
        />
        <motion.div
          className="absolute right-0 top-0 h-full bg-bb-rival"
          initial={{ width: 0 }}
          animate={{ width: total > 0 ? `${(rivalScore / total) * 100}%` : 0 }}
          transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
        />
        <div className="absolute left-1/2 top-0 bottom-0 w-0.5 bg-bb-ground -translate-x-1/2 z-10" />
      </div>

      {/* Player 2 / Bot Card */}
      <div className="flex items-center justify-between bg-bb-surface-2/80 p-3 rounded-lg border border-bb-line">
        <StatNumeral
          value={rivalScore}
          countUp
          size="md"
          className={`tabular-nums shrink-0 font-bold ${leading === (rival || "bot") ? "text-bb-rival" : "text-bb-ink"}`}
        />
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="flex flex-col items-end min-w-0">
            <span className="text-xs font-mono font-bold text-bb-ink truncate">{rivalName}</span>
            <span className="text-[10px] font-mono text-bb-ink/50">Rating: {rival ? (session.ratings[rival] ?? 1200) : (session.ratings[me] ?? 1200)}</span>
          </div>
          {rivalAvatar ? (
            <div className="w-9 h-9 rounded-full border border-cyan-400/60 bg-cyan-950/30 flex items-center justify-center shrink-0 overflow-hidden p-0.5 shadow-sm">
              <img src={rivalAvatar} alt={rivalName} className="h-full w-full rounded-full object-cover" />
            </div>
          ) : (
            <Avatar
              letter={rival[0]?.toUpperCase() ?? "?"}
              className={leading === rival ? "text-bb-rival border-bb-rival/60 bg-bb-rival/10" : "text-bb-ink/60"}
            />
          )}
        </div>
      </div>

      <div className="text-center pt-1">
        <span className="text-[10px] font-mono text-bb-ink/40 uppercase tracking-widest">
          First to {Math.ceil(total / 2)} wins the match
        </span>
      </div>
    </Panel>
  );
};
