import React from "react";
import { useProblemStatement } from "../../hooks/useProblemStatement";
import { getProblemExternalUrl } from "./types";
import { RatingBadge } from "../ui/RatingBadge";
import { CodeWorkspace } from "./CodeWorkspace";
import { SolveSidebar } from "./SolveSidebar";
import { SplitPane } from "./SplitPane";
import { StatementPane } from "./StatementPane";
import type { SolveWorkspaceProps } from "./types";

/**
 * The single "solve a problem" experience — statement + editor + judge console
 * + the shell around them. Used by both Blitz/Duel sessions (mode="session")
 * and Home practice mode (mode="practice"). Presented as one contiguous IDE
 * "window" (its own bordered surface, theme-aware like the rest of the app)
 * rather than a stack of separately-carded panels.
 */
export const SolveWorkspace: React.FC<SolveWorkspaceProps> = (props) => {
  const { problem, onBack, onAccepted, playSound, onSyncPoints, onForfeitMatch } = props;
  const { statement, loading: statementLoading, notCovered } = useProblemStatement(problem.key, problem.platform);
  const [showForfeitModal, setShowForfeitModal] = React.useState(false);

  const solved = props.mode === "session" ? props.claim !== null : props.solved;
  // Session mode locks Submit once solved (Blitz problems are claimed once);
  // practice mode allows re-submitting freely.
  const judgeableNow = problem.judgeable && (props.mode === "practice" || !solved);

  return (
    <div
      className="flex-1 flex flex-col min-h-0 rounded border-[1.5px] border-bb-line bg-bb-ground overflow-hidden bracket-frame relative"
      style={{ minHeight: 640 }}
    >
      {showForfeitModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-bb-ground/85 backdrop-blur-sm p-4">
          <div className="flex flex-col gap-4 text-center max-w-sm w-full p-6 rounded-lg border-2 border-red-500/40 bg-bb-surface shadow-2xl">
            <div className="w-10 h-10 rounded-full bg-red-500/15 border border-red-500/40 flex items-center justify-center text-red-400 mx-auto">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15m3 0l3-3m0 0l-3-3m3 3H9" />
              </svg>
            </div>
            <h3 className="font-display text-lg font-bold uppercase tracking-tight text-bb-ink">
              Force Quit Match?
            </h3>
            <p className="font-mono text-xs text-bb-ink-faint leading-relaxed">
              Are you sure you want to forfeit this duel? Your opponent will win and Elo rating points will be updated.
            </p>
            <div className="flex items-center gap-3 pt-2">
              <button
                onClick={() => setShowForfeitModal(false)}
                className="flex-1 px-4 py-2 rounded font-mono text-xs font-bold border border-bb-line text-bb-ink hover:bg-bb-ink/10 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  setShowForfeitModal(false);
                  if (onForfeitMatch) onForfeitMatch();
                  else onBack();
                }}
                className="flex-1 px-4 py-2 rounded font-mono text-xs font-bold bg-red-600 hover:bg-red-700 text-white border border-red-700 transition-colors shadow-sm"
              >
                Force Quit
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Title bar */}
      <div className="h-11 shrink-0 flex items-center justify-between gap-3 pl-2 pr-3 border-b border-bb-line bg-bb-surface select-none">
        <div className="flex items-center gap-1.5 min-w-0">
          <button
            onClick={() => {
              playSound("click");
              onBack();
            }}
            onMouseEnter={() => playSound("hover")}
            title={props.mode === "session" ? "Back to session" : "Back to problems"}
            className="w-7 h-7 shrink-0 rounded flex items-center justify-center text-bb-ink/50 hover:text-bb-ink hover:bg-bb-ink/10 transition-colors cursor-pointer"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
          </button>

          <div className="flex items-center gap-1.5 min-w-0 font-mono text-xs pl-1">
            <span className="text-bb-ink/35 shrink-0">{props.mode === "session" ? "session" : "problems"}</span>
            <span className="text-bb-ink/25 shrink-0">›</span>
            {props.mode === "session" && (
              <>
                <span className="text-bb-ink/50 shrink-0">{props.orderIndex + 1}</span>
                <span className="text-bb-ink/25 shrink-0">›</span>
              </>
            )}
            {props.mode === "practice" && (
              <span className="text-bb-ink/50 shrink-0 tabular-nums">
                {problem.contestId}
                {problem.index}
              </span>
            )}
            <span className="text-bb-ink font-semibold truncate">{problem.title}</span>
            <RatingBadge rating={problem.rating} className="shrink-0" />
          </div>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          {props.mode === "session" && (
            <div className="flex items-center gap-2 px-3 py-1 rounded bg-bb-surface-2 border border-bb-yellow/40 font-mono text-xs shadow-sm">
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] text-bb-ink/50 uppercase font-bold">YOU</span>
                <span className="font-bold text-bb-yellow text-sm tabular-nums">
                  {props.progress?.solved ?? 0}
                </span>
              </div>
              <span className="text-bb-yellow/60 font-bold text-[10px]">VS</span>
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-bb-rival text-sm tabular-nums">
                  {props.claim ? 1 : 0}
                </span>
                <span className="text-[10px] text-bb-ink/50 uppercase font-bold">Z4s</span>
              </div>
            </div>
          )}

          {solved && (
            <span className="flex items-center gap-1 text-[10px] font-mono font-bold uppercase tracking-wider text-bb-yellow">
              <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth="3" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
              </svg>
              Solved
            </span>
          )}
          <span className="hidden sm:flex items-center gap-1.5 text-[10px] font-mono text-bb-yellow/70">
            <span className="w-1.5 h-1.5 rounded-full bg-bb-yellow/70" />
            C++17
          </span>
          {props.mode === "session" ? (
            <span className="flex items-center gap-1.5 text-[10px] font-mono text-bb-ink/40">
              <span className={`w-1.5 h-1.5 rounded-full ${props.pollState === "live" ? "bg-bb-yellow animate-pulse" : "bg-bb-ink/30"}`} />
              <span className="hidden md:inline">{props.pollState === "live" ? "watching" : props.pollState === "paused" ? "paused" : "retrying"}</span>
            </span>
          ) : null}
          <a
            href={getProblemExternalUrl(problem)}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => playSound("click")}
            title={`Open on ${
              problem.platform
                ? problem.platform.toLowerCase() === "codeforces"
                  ? "Codeforces"
                  : problem.platform.toLowerCase() === "leetcode"
                  ? "LeetCode"
                  : problem.platform.toLowerCase() === "atcoder"
                  ? "AtCoder"
                  : problem.platform.toLowerCase() === "codechef"
                  ? "CodeChef"
                  : problem.platform.charAt(0).toUpperCase() + problem.platform.slice(1).toLowerCase()
                : "Codeforces"
            }`}
            className="w-7 h-7 rounded flex items-center justify-center text-bb-ink/40 hover:text-bb-ink hover:bg-bb-ink/10 transition-colors"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H18m0 0v4.5M18 6l-7.5 7.5M6 10.5V18h7.5" />
            </svg>
          </a>
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 flex min-h-0">
        {props.mode === "session" && (
          <SolveSidebar
            items={props.sidebarItems}
            orderIndex={props.orderIndex}
            progress={props.progress}
            claim={props.claim}
            onSelectProblem={props.onSelectProblem}
            onForfeitMatch={() => setShowForfeitModal(true)}
            playSound={playSound}
          />
        )}

        <SplitPane
          storageKey="bb_solve_split_v1"
          leftLabel="Problem"
          rightLabel="solution.cpp"
          left={
            <StatementPane
              problem={problem}
              statement={statement}
              loading={statementLoading}
              notCovered={notCovered}
              mode={props.mode}
              playSound={playSound}
            />
          }
          right={
            <CodeWorkspace
              key={problem.key}
              problemKey={problem.key}
              title={problem.title}
              sessionId={props.mode === "session" ? props.sessionId : undefined}
              judgeable={judgeableNow}
              testCount={statement?.testCount ?? 0}
              examples={statement?.examples ?? []}
              playSound={playSound}
              onAccepted={onAccepted}
              onSyncPoints={onSyncPoints}
              platform={problem.platform}
              starterCode={statement?.starterCode}
            />
          }
        />
      </div>
    </div>
  );
};
