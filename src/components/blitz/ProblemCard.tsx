import React from "react";
import { motion } from "motion/react";
import { claimedBy, isDuelMode, type BlitzSession, type SessionProblem } from "../../lib/blitzSession";
import { problemKey, problemUrl } from "../../lib/codeforces";
import { RatingBadge, difficultyLabel, colorForRating } from "../ui/RatingBadge";
import { Tag } from "../ui/Tag";
import { Button } from "../ui/Button";

interface ProblemCardProps {
  session: BlitzSession;
  problem: SessionProblem;
  orderIndex: number;
  onOpen: () => void;
  playSound: (type: "click" | "hover") => void;
}

const LETTERS = "ABCDEFGH";

const getProblemUrl = (problem: SessionProblem): string => {
  if (problem.url) return problem.url;
  const platform = (problem.platform ?? "").toLowerCase();
  if (platform === "leetcode" || platform === "lc") {
    return `https://leetcode.com/problems/${problem.index.replace(/^LC-/, "")}/`;
  }
  if (platform === "atcoder" || platform === "ac") {
    return `https://atcoder.jp/contests/${problem.index.split("_")[0]}/tasks/${problem.index}`;
  }
  if (platform === "codechef" || platform === "cc") {
    return `https://www.codechef.com/problems/${problem.index}`;
  }
  if (problem.contestId && problem.contestId > 0) {
    return `https://codeforces.com/problemset/problem/${problem.contestId}/${problem.index}`;
  }
  return `https://leetcode.com/problems/${problem.index.replace(/^LC-/, "")}/`;
};

export const ProblemCard: React.FC<ProblemCardProps> = ({ session, problem, orderIndex, onOpen, playSound }) => {
  const key = problemKey(problem);
  const me = session.handles[0];
  const isDuel = isDuelMode(session.mode);

  const solvedByMe = session.results[me]?.[key] !== undefined;
  const winner = isDuel ? claimedBy(session, key) : solvedByMe ? me : null;
  const solved = winner !== null;
  const mine = winner === me;

  const color = colorForRating(problem.rating);
  const label = difficultyLabel(problem.rating);
  const letter = LETTERS[orderIndex] ?? String(orderIndex + 1);

  // Problem N is locked unless previous problem N-1 is solved/claimed by anyone in the session.
  const isLocked = orderIndex > 0 && (() => {
    const prevProb = session.problems[orderIndex - 1];
    if (!prevProb) return false;
    const prevKey = problemKey(prevProb);
    const prevWinner = isDuel ? claimedBy(session, prevKey) : (session.results[me]?.[prevKey] !== undefined ? me : null);
    return prevWinner === null;
  })();

  if (isLocked) {
    return (
      <div className="relative flex items-center justify-between gap-4 pl-4 pr-5 py-4 opacity-50 bg-bb-surface-2/40 border-b border-bb-line last:border-b-0 cursor-not-allowed select-none">
        <div className="flex items-center gap-3.5 min-w-0">
          <div className="shrink-0 w-10 h-10 rounded-full border-2 border-bb-line bg-bb-ground flex items-center justify-center font-mono font-bold text-sm text-bb-ink/40">
            🔒
          </div>
          <div className="flex flex-col min-w-0">
            <span className="text-sm font-semibold text-bb-ink/50 truncate">
              {problem.name}
            </span>
            <span className="text-[10px] font-mono text-bb-yellow font-bold uppercase tracking-wider animate-pulse mt-0.5">
              🔒 Locked — Solve Question {orderIndex} to unlock Question {orderIndex + 1}
            </span>
          </div>
        </div>
        <Tag tone="neutral" className="shrink-0">Locked</Tag>
      </div>
    );
  }

  return (
    <motion.div
      layout
      whileHover={{ x: 3 }}
      onClick={() => {
        playSound("click");
        onOpen();
      }}
      onMouseEnter={() => playSound("hover")}
      className={`group relative flex items-center gap-4 pl-4 pr-5 py-4 cursor-pointer transition-colors border-b border-bb-line last:border-b-0 ${
        mine ? "bg-bb-yellow/[0.05]" : "hover:bg-bb-ink/[0.03]"
      }`}
    >
      {/* Seed token — ring/label colored by the problem's own rating color. */}
      <div
        className="relative shrink-0 w-10 h-10 rounded-full border-2 bg-bb-ground flex items-center justify-center font-mono font-black text-sm"
        style={{ borderColor: color, color }}
      >
        {letter}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-baseline gap-2 min-w-0 mb-1.5">
          <span className="text-sm text-bb-ink font-semibold group-hover:text-bb-yellow transition-colors truncate">
            {problem.name}
          </span>
          <span className="text-[10px] font-mono text-bb-ink/35 shrink-0 tabular-nums">
            {problem.contestId > 0 ? `${problem.contestId}${problem.index}` : problem.index}
          </span>
          <span className="text-[9px] font-mono uppercase tracking-wider shrink-0" style={{ color }}>
            {label}
          </span>
        </div>
        {problem.tags.length > 0 && (
          <div className="flex items-center gap-1.5 flex-wrap">
            {problem.tags.slice(0, 4).map((tag) => (
              <Tag key={tag} tone="neutral">
                {tag}
              </Tag>
            ))}
            {problem.tags.length > 4 && (
              <span className="text-[9px] font-mono text-bb-ink/35">+{problem.tags.length - 4}</span>
            )}
          </div>
        )}
      </div>

      <RatingBadge rating={problem.rating} className="shrink-0 hidden sm:inline-flex" />

      <Button
        as="a"
        href={getProblemUrl(problem)}
        target="_blank"
        rel="noopener noreferrer"
        onClick={(e) => e.stopPropagation()}
        variant="outline"
        size="sm"
        className="shrink-0 hidden md:inline-flex"
      >
        Solve ↗
      </Button>

      {solved ? (
        <motion.span
          initial={{ scale: 0, rotate: -20 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ type: "spring", stiffness: 480, damping: 22 }}
          className="shrink-0"
        >
          <Tag tone={mine ? "accent" : "neutral"}>
            <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" strokeWidth="3.5" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
            </svg>
            {isDuel ? (session.displayHandles[winner as string] ?? winner) : "Solved"}
          </Tag>
        </motion.span>
      ) : (
        <span className="shrink-0 w-2 h-2 rounded-full border border-bb-line" />
      )}

      <span className="shrink-0 text-bb-ink/25 group-hover:text-bb-yellow group-hover:translate-x-0.5 transition-all text-xs">
        →
      </span>
    </motion.div>
  );
};
