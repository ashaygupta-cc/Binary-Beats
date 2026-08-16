import React from "react";
import type { SubmissionRecord } from "../../hooks/useSubmissionHistory";
import { verdictTone } from "../../lib/verdictTone";

interface SubmissionHistoryPanelProps {
  history: SubmissionRecord[];
  onRestore: (code: string) => void;
}

function formatTime(seconds: number): string {
  const d = new Date(seconds * 1000);
  return d.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit", second: "2-digit" });
}

export const SubmissionHistoryPanel: React.FC<SubmissionHistoryPanelProps> = ({ history, onRestore }) => {
  if (history.length === 0) {
    return (
      <div className="h-full flex flex-col items-center justify-center gap-2.5 text-center px-6">
        <div className="w-8 h-8 rounded-full border border-bb-line flex items-center justify-center text-bb-ink/25 shrink-0">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l2.5 2.5M20 12a8 8 0 11-8-8" />
          </svg>
        </div>
        <span className="text-bb-ink/40 text-[11px] leading-relaxed max-w-sm">
          Submit a solution to start building this problem's attempt history.
        </span>
      </div>
    );
  }

  return (
    <div className="flex flex-col divide-y divide-dashed divide-bb-line">
      {history.map((r) => {
        const tone = verdictTone(r.status);
        return (
          <div key={r.id} className="group flex items-center gap-3 py-2 first:pt-0">
            <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${tone.dot}`} />
            <span className={`text-[10px] font-mono font-bold uppercase tracking-wider shrink-0 w-8 ${tone.text}`}>{r.status}</span>
            <span className="text-bb-ink/50 text-[10px] shrink-0 hidden sm:inline">{tone.label}</span>
            <span className="text-bb-ink/35 text-[10px] tabular-nums shrink-0 ml-auto">
              {r.status !== "CE" ? `${r.passedCount}/${r.totalCount} · ` : ""}
              {r.timeMs}ms
              {r.peakMemoryMb !== undefined ? ` · ${r.peakMemoryMb}MB` : ""}
            </span>
            <span className="text-bb-ink/30 text-[10px] tabular-nums shrink-0">{formatTime(r.submittedAtSeconds)}</span>
            <button
              onClick={() => onRestore(r.code)}
              className="text-[9px] font-mono uppercase tracking-wider text-bb-ink/0 group-hover:text-bb-yellow transition-colors cursor-pointer shrink-0"
            >
              Restore
            </button>
          </div>
        );
      })}
    </div>
  );
};
