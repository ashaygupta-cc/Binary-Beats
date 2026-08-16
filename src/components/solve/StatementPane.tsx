import React from "react";
import { getProblemExternalUrl } from "./types";
import type { ProblemStatementData } from "../../lib/problemsApi";
import { RatingBadge } from "../ui/RatingBadge";
import { Eyebrow } from "../ui/Eyebrow";
import { Tag } from "../ui/Tag";
import { Button } from "../ui/Button";
import { ProblemStatement } from "./ProblemStatement";
import type { SolvableProblem } from "./types";

interface StatementPaneProps {
  problem: SolvableProblem;
  statement: ProblemStatementData | null;
  loading: boolean;
  notCovered: boolean;
  /** Session mode has a server-side poller auto-detecting CF verdicts; practice mode doesn't. */
  mode: "session" | "practice";
  playSound: (type: "click" | "hover") => void;
}

const StatementSkeleton: React.FC = () => (
  <div className="flex-1 min-h-0 overflow-hidden bg-bb-surface p-5">
    <div className="animate-pulse flex flex-col gap-3">
      <div className="h-3 w-20 rounded bg-bb-ink/10" />
      <div className="h-6 w-2/3 rounded bg-bb-ink/10" />
      <div className="h-3 w-full rounded bg-bb-ink/[0.06]" />
      <div className="h-3 w-full rounded bg-bb-ink/[0.06]" />
      <div className="h-3 w-5/6 rounded bg-bb-ink/[0.06]" />
      <div className="h-28 w-full rounded bg-bb-ink/[0.04] mt-3" />
    </div>
  </div>
);

export const StatementPane: React.FC<StatementPaneProps> = ({ problem, statement, loading, notCovered, mode, playSound }) => {
  if (statement) return <ProblemStatement statement={statement} playSound={playSound} />;
  if (loading) return <StatementSkeleton />;

  const rawPlatform = (problem.platform ?? "").toLowerCase();
  const platformName =
    rawPlatform === "leetcode" || rawPlatform === "lc"
      ? "LeetCode"
      : rawPlatform === "atcoder" || rawPlatform === "ac"
      ? "AtCoder"
      : rawPlatform === "codechef" || rawPlatform === "cc"
      ? "CodeChef"
      : "Codeforces";

  return (
    <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar bg-bb-surface p-5">
      <div className="mb-4 pb-4 border-b border-bb-line">
        <Eyebrow number="01" className="mb-1.5">
          Problem
        </Eyebrow>
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <span className="text-[10px] font-mono uppercase tracking-wider text-bb-ink/35 tabular-nums">
              {problem.contestId > 0 ? `${problem.contestId}${problem.index}` : problem.key}
            </span>
            <h3 className="text-lg font-display font-bold text-bb-ink mt-1">{problem.title}</h3>
          </div>
          <RatingBadge rating={problem.rating} className="shrink-0" />
        </div>
      </div>

      {problem.tags.length > 0 && (
        <div className="mb-5">
          <span className="text-[10px] font-mono uppercase tracking-wider text-bb-ink/35 block mb-1.5">Tags</span>
          <div className="flex flex-wrap gap-1.5">
            {problem.tags.map((tag) => (
              <Tag key={tag} tone="neutral">
                {tag}
              </Tag>
            ))}
          </div>
        </div>
      )}

      <div className="rounded border border-bb-line bg-bb-ground/40 p-4 mb-5">
        <p className="text-xs text-bb-ink/60 leading-relaxed">
          {mode === "session"
            ? notCovered
              ? `This problem isn't in the local statement dataset (it covers problems up to ~2025), so the full statement lives on ${platformName}. Solve it there — we detect your accepted verdict automatically within ~15s.`
              : `The statement couldn't be loaded right now — the full problem is always available on ${platformName}. Solve it there and we'll detect your accepted verdict automatically within ~15s.`
            : notCovered
              ? `This problem isn't in the local statement dataset (it covers problems up to ~2025), so the full statement lives on ${platformName}. Read it there, then come back and submit your solution here.`
              : `The statement couldn't be loaded right now — the full problem is always available on ${platformName}. Read it there, then come back and submit your solution here.`}
        </p>
      </div>

      <Button as="a" href={getProblemExternalUrl(problem)} target="_blank" rel="noopener noreferrer" onClick={() => playSound("click")} variant="primary" size="md">
        Open on {platformName} ↗
      </Button>
    </div>
  );
};
