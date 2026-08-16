import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Panel } from "../ui/Panel";
import { Button } from "../ui/Button";

interface MatchmakingCardProps {
  playerHandle: string;
  playerRating: number | null;
  mode: string;
  onMatched: (opponentHandle: string | null) => void;
  onCancel: () => void;
  playSound?: (t: "click" | "hover") => void;
}

export const MatchmakingCard: React.FC<MatchmakingCardProps> = ({
  playerHandle,
  playerRating,
  mode,
  onMatched,
  onCancel,
  playSound,
}) => {
  const [secondsLeft, setSecondsLeft] = useState(10);
  const [matchingBot, setMatchingBot] = useState(false);
  const [isCreating, setIsCreating] = useState(false);

  useEffect(() => {
    if (secondsLeft <= 0) {
      setMatchingBot(true);
      setIsCreating(true);
      playSound?.("click");
      onMatched(null); // Auto-match vs Z4s ⚡
      return;
    }

    const interval = setInterval(() => {
      setSecondsLeft((s) => s - 1);
    }, 1000);

    return () => clearInterval(interval);
  }, [secondsLeft, onMatched, playSound]);

  const modeTitle = mode.replace("_", " ").toUpperCase();
  const effectiveRating = playerRating ?? 1200;

  return (
    <motion.div
      initial={{ opacity: 0, y: 50, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -40, scale: 0.95 }}
      transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
      className="w-full max-w-xl mx-auto py-6"
    >
      <Panel bracket className="p-7 sm:p-8 flex flex-col items-center gap-6 text-center border-bb-yellow/30 shadow-[0_16px_50px_rgba(234,179,8,0.1)]">
        {/* Mode & Header */}
        <div className="flex flex-col items-center gap-1">
          <span className="font-hud text-[11px] uppercase tracking-[0.25em] text-bb-yellow">
            ＡＲＥＮＡ ＭＡＴＣＨＭＡＫＩＮＧ
          </span>
          <h3 className="font-display text-2xl font-bold uppercase tracking-tight text-bb-ink sm:text-3xl">
            {modeTitle} BATTLE
          </h3>
          <p className="font-mono text-xs text-bb-ink/60">
            Searching for rating-matched opponent ({effectiveRating} ± 100)...
          </p>
        </div>

        {/* Square Matchmaking Cards (You VS Opponent) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full my-2">
          {/* Player 1 Card (You) */}
          <div className="flex flex-col items-center justify-center p-5 rounded-xl bg-bb-surface-2/90 border border-bb-yellow/40 shadow-inner gap-2">
            <div className="w-16 h-16 rounded-full border-2 border-bb-yellow bg-bb-ground flex items-center justify-center font-display text-xl font-bold text-bb-yellow shadow-md">
              {playerHandle[0]?.toUpperCase() ?? "P"}
            </div>
            <span className="font-mono font-bold text-sm text-bb-ink truncate max-w-[140px]">
              {playerHandle}
            </span>
            <span className="font-mono text-[11px] text-bb-yellow font-semibold px-2 py-0.5 rounded bg-bb-yellow/10 border border-bb-yellow/30">
              Rating: {effectiveRating}
            </span>
          </div>

          {/* Opponent Card (Searching / CP-Bot AI) */}
          <div className="flex flex-col items-center justify-center p-5 rounded-xl bg-bb-surface-2/90 border border-bb-line gap-2 relative overflow-hidden">
            <AnimatePresence mode="wait">
              {matchingBot ? (
                <motion.div
                  key="bot-found"
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="flex flex-col items-center gap-2"
                >
                  <div className="w-16 h-16 rounded-full border-2 border-cyan-400 bg-cyan-950/40 flex items-center justify-center shadow-md overflow-hidden p-0.5 shrink-0">
                    <img src="/avatars/ashay.jpeg" alt="Z4s" className="h-full w-full rounded-full object-cover" />
                  </div>
                  <span className="font-mono font-bold text-sm text-cyan-400">
                    Z4s
                  </span>
                  <span className="font-mono text-[11px] text-cyan-400 font-semibold px-2 py-0.5 rounded bg-cyan-400/10 border border-cyan-400/30">
                    Rating: {effectiveRating}
                  </span>
                </motion.div>
              ) : (
                <motion.div
                  key="searching"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex flex-col items-center gap-2"
                >
                  {/* Radar Pulse Spinner */}
                  <div className="relative w-16 h-16 flex items-center justify-center">
                    <div className="absolute inset-0 rounded-full border-2 border-bb-yellow/20 animate-ping" />
                    <div className="w-12 h-12 rounded-full border-2 border-dashed border-bb-yellow animate-spin" />
                    <span className="font-mono text-xs font-bold text-bb-yellow">
                      {secondsLeft}s
                    </span>
                  </div>
                  <span className="font-mono text-xs text-bb-ink/60 animate-pulse">
                    Searching opponent...
                  </span>
                  <span className="font-mono text-[10px] text-bb-ink/40">
                    Auto-pairing in {secondsLeft}s
                  </span>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Action Button & Room Creating Status */}
        <div className="flex items-center gap-3 w-full justify-center">
          {isCreating ? (
            <motion.div
              key="creating"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex flex-col items-center gap-2 py-1"
            >
              <div className="w-8 h-8 rounded-full border-2 border-bb-yellow border-t-transparent animate-spin" />
              <span className="font-mono text-xs font-bold text-bb-yellow uppercase tracking-wider animate-pulse">
                Room is being created... Preparing Arena ⚡
              </span>
            </motion.div>
          ) : (
            <Button
              variant="outline"
              size="md"
              onClick={onCancel}
              className="w-full max-w-xs font-mono text-xs uppercase"
            >
              Cancel Search
            </Button>
          )}
        </div>
      </Panel>
    </motion.div>
  );
};
