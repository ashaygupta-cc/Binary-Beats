import React from "react";
import { colorForRating } from "../ui/RatingBadge";
import { Eyebrow } from "../ui/Eyebrow";
import type { SolveClaim, SolveSidebarProblem } from "./types";

interface SolveSidebarProps {
  items: SolveSidebarProblem[];
  orderIndex: number;
  progress: { solved: number; total: number };
  claim: SolveClaim;
  onSelectProblem: (index: number) => void;
  onForfeitMatch?: () => void;
  playSound: (type: "click" | "hover") => void;
}

export const SolveSidebar: React.FC<SolveSidebarProps> = ({ items, orderIndex, progress, claim, onSelectProblem, onForfeitMatch, playSound }) => {
  return (
    <div className="w-64 shrink-0 flex flex-col border-r border-bb-line bg-bb-surface min-h-0">
      <div className="px-3 pt-3 pb-2.5 border-b border-bb-line/70 shrink-0">
        <div className="flex items-center justify-between mb-2">
          <Eyebrow tone="muted">Problems</Eyebrow>
          <span className="text-[10px] font-mono text-bb-ink/35 tabular-nums">
            {progress.solved}/{progress.total}
          </span>
        </div>
        <div className="h-[3px] rounded-sm bg-bb-ink/10 overflow-hidden flex gap-px">
          {items.map((item) => (
            <span
              key={item.key}
              className={`flex-1 rounded-sm ${item.solvedByMe ? "bg-bb-yellow" : item.solved ? "bg-bb-ink/35" : "bg-transparent"}`}
            />
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar py-1">
        {items.map((item, i) => {
          const isCurrent = i === orderIndex;
          const isLocked = i > 0 && !items[i - 1].solved;

          if (isLocked) {
            return (
              <div
                key={item.key}
                className="relative flex items-center gap-2 h-8 pl-3 pr-2.5 opacity-40 cursor-not-allowed font-mono text-[11.5px] text-bb-ink/40 select-none"
              >
                <span className="shrink-0 text-xs">🔒</span>
                <span className="text-bb-ink/35 shrink-0 w-3 text-right">{item.letter}</span>
                <span className="flex-1 truncate line-through">{item.title}</span>
              </div>
            );
          }
          return (
            <div
              key={item.key}
              onClick={() => {
                if (!isCurrent) {
                  playSound("click");
                  onSelectProblem(i);
                }
              }}
              onMouseEnter={() => !isCurrent && playSound("hover")}
              className={`relative flex items-center gap-2 h-8 pl-3 pr-2.5 cursor-pointer font-mono text-[11.5px] transition-colors ${
                isCurrent ? "bg-bb-ink/[0.07] text-bb-ink" : "text-bb-ink/55 hover:bg-bb-ink/[0.04] hover:text-bb-ink/85"
              }`}
            >
              {isCurrent && <span className="absolute left-0 top-0 bottom-0 w-[2px] bg-bb-yellow" />}
              <span
                className={`w-1.5 h-1.5 rounded-full shrink-0 ${item.rating == null ? "bg-bb-ink/25" : ""}`}
                style={item.rating != null ? { background: colorForRating(item.rating) } : undefined}
              />
              <span className="text-bb-ink/35 shrink-0 w-3 text-right">{item.letter}</span>
              <span className="flex-1 truncate">{item.title}</span>
              {item.solved && (
                <svg
                  className={`w-3 h-3 shrink-0 ${item.solvedByMe ? "text-bb-yellow" : "text-bb-ink/30"}`}
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="3"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                </svg>
              )}
            </div>
          );
        })}
      </div>

      {claim && (
        <div
          className={`shrink-0 px-3 py-2 border-t font-mono text-[10px] uppercase tracking-wider text-center ${
            claim.mine ? "border-bb-yellow/25 bg-bb-yellow/[0.06] text-bb-yellow" : "border-bb-line text-bb-ink/45"
          }`}
        >
          {claim.mine ? "Solved ✓" : `Claimed by ${claim.label}`}
        </div>
      )}

      {/* Bottom left corner: Force Quit / Exit Circular Gate Button */}
      {onForfeitMatch && (
        <div className="p-2.5 border-t border-bb-line bg-bb-surface mt-auto flex items-center justify-start">
          <button
            onClick={() => {
              playSound("click");
              onForfeitMatch();
            }}
            onMouseEnter={() => playSound("hover")}
            title="Force Quit / Forfeit Match"
            className="w-8 h-8 rounded-full flex items-center justify-center text-red-400 bg-red-500/10 border border-red-500/30 hover:bg-red-500/20 hover:border-red-500/60 transition-all cursor-pointer shadow-sm"
          >
            <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" strokeWidth="2.2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15m3 0l3-3m0 0l-3-3m3 3H9" />
            </svg>
          </button>
        </div>
      )}
    </div>
  );
};
