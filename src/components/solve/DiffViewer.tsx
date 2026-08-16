import React, { useMemo } from "react";
import { verdictTone } from "../../lib/verdictTone";

/** One line, tokenized on whitespace — mirrors the executor's compareTokenStreams semantics. */
function tokenizeLines(text: string): string[][] {
  return text
    .replace(/\s+$/, "")
    .split("\n")
    .map((line) => (line.trim().length ? line.trim().split(/\s+/) : []));
}

/** Finds the first mismatching *token* the same way the judge does (whitespace-tolerant,
 *  flattened stream comparison), then maps that token index back to a display line on
 *  each side — so the highlighted line is genuinely why the judge said WA, not a guess
 *  from a generic line-diff that could flag a spurious mismatch on reflowed whitespace. */
function firstMismatch(expected: string, actual: string): { expectedLine: number; actualLine: number } {
  const eLines = tokenizeLines(expected);
  const aLines = tokenizeLines(actual);
  const eFlat = expected.trim().length ? expected.trim().split(/\s+/) : [];
  const aFlat = actual.trim().length ? actual.trim().split(/\s+/) : [];

  let idx = 0;
  while (idx < eFlat.length && idx < aFlat.length && eFlat[idx] === aFlat[idx]) idx++;

  const lineForToken = (lines: string[][], target: number) => {
    let count = 0;
    for (let l = 0; l < lines.length; l++) {
      count += lines[l].length;
      if (count > target) return l;
    }
    return Math.max(lines.length - 1, 0);
  };

  return { expectedLine: lineForToken(eLines, idx), actualLine: lineForToken(aLines, idx) };
}

// A diff view only ever appears in a WA context — highlight color is routed
// through the shared verdict tone map rather than a hardcoded hex.
const waTone = verdictTone("WA");

const LineBlock: React.FC<{ label: string; text: string; highlightLine: number }> = ({ label, text, highlightLine }) => {
  const lines = text.replace(/\n$/, "").split("\n");
  return (
    <div className="flex flex-col min-h-0">
      <div className="h-8 px-3 flex items-center border-b border-bb-line bg-bb-ground/40 shrink-0">
        <span className="text-[10px] font-mono uppercase tracking-wider text-bb-ink/50">{label}</span>
      </div>
      <div className="max-h-56 overflow-auto custom-scrollbar font-mono text-[11px] leading-[18px] py-1">
        {lines.map((line, i) => (
          <div key={i} className={`flex ${i === highlightLine ? waTone.bg : ""}`}>
            <span className={`w-8 shrink-0 text-right pr-2 select-none ${i === highlightLine ? `${waTone.text} font-bold` : "text-bb-ink/25"}`}>
              {i === highlightLine ? "▶" : i + 1}
            </span>
            <span className="text-bb-ink/90 whitespace-pre-wrap break-all pr-3">{line || " "}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

interface DiffViewerProps {
  expected: string;
  actual: string;
  className?: string;
}

/** WA diff — shared by the submit verdict (Verdict.failedTest) and the samples panel. */
export const DiffViewer: React.FC<DiffViewerProps> = ({ expected, actual, className = "" }) => {
  const { expectedLine, actualLine } = useMemo(() => firstMismatch(expected, actual), [expected, actual]);
  return (
    <div
      className={`rounded border border-bb-line bg-bb-surface overflow-hidden grid grid-cols-1 sm:grid-cols-2 divide-y sm:divide-y-0 sm:divide-x divide-bb-line ${className}`}
    >
      <LineBlock label="Expected Output" text={expected} highlightLine={expectedLine} />
      <LineBlock label="Your Output" text={actual || "(empty)"} highlightLine={actualLine} />
    </div>
  );
};
