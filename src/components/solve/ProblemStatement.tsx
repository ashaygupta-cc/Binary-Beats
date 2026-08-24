import React, { useState } from "react";
import katex from "katex";
import "katex/dist/katex.min.css";
import { splitMathSegments } from "../../lib/mathText";
import { problemUrl } from "../../lib/codeforces";
import type { ProblemStatementData } from "../../lib/problemsApi";

interface ProblemStatementProps {
  statement: ProblemStatementData;
  playSound: (type: "click" | "hover") => void;
}

const FormattedTextNode: React.FC<{ text: string }> = ({ text }) => {
  const parts = [];
  const regex = /(\[.*?\]\(.*?\)|`.*?`|\*\*.*?\*\*|\*.*?\*)/g;
  let lastIndex = 0;
  let match;

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(text.substring(lastIndex, match.index));
    }
    const str = match[0];
    if (str.startsWith("[")) {
      const linkMatch = str.match(/\[(.*?)\]\((.*?)\)/);
      if (linkMatch) {
        parts.push(
          <a
            key={match.index}
            href={linkMatch[2]}
            target="_blank"
            rel="noopener noreferrer"
            className="text-bb-yellow underline hover:text-bb-yellow/80 font-medium"
          >
            {linkMatch[1]}
          </a>
        );
      } else {
        parts.push(str);
      }
    } else if (str.startsWith("`")) {
      parts.push(
        <code key={match.index} className="px-1.5 py-0.5 rounded bg-bb-ground border border-bb-line font-mono text-[12px] text-bb-ink">
          {str.slice(1, -1)}
        </code>
      );
    } else if (str.startsWith("**")) {
      parts.push(<strong key={match.index} className="font-semibold text-bb-ink">{str.slice(2, -2)}</strong>);
    } else if (str.startsWith("*")) {
      parts.push(<em key={match.index} className="italic">{str.slice(1, -1)}</em>);
    }
    lastIndex = regex.lastIndex;
  }
  if (lastIndex < text.length) {
    parts.push(text.substring(lastIndex));
  }

  return <>{parts}</>;
};

const MathText: React.FC<{ text: string }> = ({ text }) => {
  const lines = text.split("\n");
  return (
    <div className="space-y-1.5">
      {lines.map((line, idx) => {
        const trimmed = line.trim();
        if (!trimmed) return <div key={idx} className="h-1" />;

        if (trimmed.startsWith("### ")) {
          return <h4 key={idx} className="text-sm font-bold text-bb-ink mt-3 mb-1 font-display tracking-tight">{trimmed.slice(4)}</h4>;
        }
        if (trimmed.startsWith("## ")) {
          return <h3 key={idx} className="text-base font-bold text-bb-ink mt-4 mb-1 font-display tracking-tight">{trimmed.slice(3)}</h3>;
        }
        if (trimmed.startsWith("# ")) {
          return <h2 key={idx} className="text-lg font-bold text-bb-ink mt-4 mb-2 font-display tracking-tight">{trimmed.slice(2)}</h2>;
        }

        const isBullet = trimmed.startsWith("• ") || trimmed.startsWith("- ") || trimmed.startsWith("* ");
        const contentStr = isBullet ? trimmed.slice(2) : trimmed;

        return (
          <div key={idx} className={`leading-relaxed text-[13px] text-bb-ink/80 ${isBullet ? "pl-4 relative before:content-['•'] before:absolute before:left-1 before:text-bb-yellow" : ""}`}>
            {splitMathSegments(contentStr).map((seg, si) =>
              seg.kind === "text" ? (
                <FormattedTextNode key={si} text={seg.value} />
              ) : (
                <span
                  key={si}
                  className={seg.kind === "blockmath" ? "block my-2 text-center overflow-x-auto font-mono text-bb-yellow" : "font-mono text-bb-ink font-medium px-0.5"}
                  dangerouslySetInnerHTML={{
                    __html: katex.renderToString(seg.value, {
                      throwOnError: false,
                      displayMode: seg.kind === "blockmath",
                    }),
                  }}
                />
              )
            )}
          </div>
        );
      })}
    </div>
  );
};

const Section: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
  <div className="mb-5">
    <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-bb-ink/40 block mb-1.5">{title}</span>
    <div className="text-[13px] text-bb-ink/80">{children}</div>
  </div>
);

const CopyButton: React.FC<{ text: string }> = ({ text }) => {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text);
          setCopied(true);
          setTimeout(() => setCopied(false), 1500);
        } catch {
          /* no-op */
        }
      }}
      className="text-[9px] font-mono uppercase tracking-wider text-bb-ink/40 hover:text-bb-yellow transition-colors cursor-pointer shrink-0"
    >
      {copied ? "copied ✓" : "copy"}
    </button>
  );
};

function platformMeta(statement: ProblemStatementData): { name: string; isLc: boolean; url: string; datasetName: string; datasetUrl: string } {
  const platform = (statement.platform || "codeforces").toLowerCase();
  const id = statement.key.toLowerCase().replace(/^lc-/, "");

  if (platform === "leetcode" || statement.key.startsWith("LC-") || (!statement.contestId && statement.key.includes("-"))) {
    return {
      name: "LeetCode",
      isLc: true,
      url: `https://leetcode.com/problems/${id}/`,
      datasetName: "newfacade/LeetCodeDataset",
      datasetUrl: "https://huggingface.co/datasets/newfacade/LeetCodeDataset",
    };
  }

  return {
    name: "Codeforces",
    isLc: false,
    url: statement.contestId > 0 && statement.index ? `https://codeforces.com/problemset/problem/${statement.contestId}/${statement.index}` : problemUrl(statement),
    datasetName: "sigcp/hardtests_problems",
    datasetUrl: "https://huggingface.co/datasets/sigcp/hardtests_problems",
  };
}

function getCfRank(rating: number | null): { rank: string; color: string } {
  if (rating === null) return { rank: "Unrated", color: "text-bb-ink-faint bg-bb-ink/5 border-bb-line" };
  if (rating < 1200) return { rank: "Newbie", color: "text-gray-400 bg-gray-500/10 border-gray-500/30" };
  if (rating < 1400) return { rank: "Pupil", color: "text-emerald-400 bg-emerald-500/10 border-emerald-500/30" };
  if (rating < 1600) return { rank: "Specialist", color: "text-cyan-400 bg-cyan-500/10 border-cyan-500/30" };
  if (rating < 1900) return { rank: "Expert", color: "text-blue-400 bg-blue-500/10 border-blue-500/30" };
  if (rating < 2100) return { rank: "Candidate Master", color: "text-purple-400 bg-purple-500/10 border-purple-500/30" };
  if (rating < 2300) return { rank: "Master", color: "text-amber-400 bg-amber-500/10 border-amber-500/30" };
  return { rank: "Grandmaster", color: "text-rose-500 bg-rose-500/10 border-rose-500/30" };
}

function cleanStatementText(text: string | null, title?: string): string {
  if (!text) return "";
  let s = text;
  s = s.replace(/<sup>([\s\S]*?)<\/sup>/gi, "^$1");
  s = s.replace(/<sub>([\s\S]*?)<\/sub>/gi, "_$1");
  s = s.replace(/([-\s(<]|\b)231\b/g, "$12^31");
  s = s.replace(/([-\s(<]|\b)230\b/g, "$12^30");
  s = s.replace(/([-\s(<]|\b)109\b/g, "$110^9");
  s = s.replace(/([-\s(<]|\b)105\b/g, "$110^5");
  s = s.replace(/([-\s(<]|\b)104\b/g, "$110^4");
  s = s.replace(/```\s*\n\s*\n\s*```/gi, "");
  s = s.replace(/```\s*```/gi, "");
  s = s.replace(/^[\s\n]*You are an? expert [^\n]+\.?\s*/gi, "");
  s = s.replace(/^[\s\n]*As an? expert [^\n]+\.?\s*/gi, "");
  s = s.replace(/^[\s\n]*Please write a (python|c\+\+|java|solution)[^\n]+\.?\s*/gi, "");
  s = s.replace(/^[\s\n]*Write a (python|c\+\+|java) function[^\n]+\.?\s*/gi, "");
  s = s.replace(/^[\s\n]*###?\s*Question:\s*/gi, "");
  if (title) {
    const escTitle = title.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    s = s.replace(new RegExp(`^[\\s\\n]*#{1,3}\\s*${escTitle}\\s*\\n+`, "i"), "");
    s = s.replace(new RegExp(`^[\\s\\n]*${escTitle}\\s*\\n+`, "i"), "");
  }
  s = s.replace(/###?\s*Format:[\s\S]*$/gi, "");
  s = s.replace(/Format:\s*You will use the following starter code[\s\S]*$/gi, "");
  s = s.replace(/###?\s*(Solution|Answer|Python Solution|C\+\+ Solution)[\s\S]*$/gi, "");
  s = s.replace(/```(python|cpp|c\+\+|java)[\s\S]*?```/gi, "");
  return s.trim();
}

export const ProblemStatement: React.FC<ProblemStatementProps> = ({ statement, playSound }) => {
  const platform = platformMeta(statement);
  const cfRank = getCfRank(statement.rating);

  const hasValidSampleCases =
    statement.examples.length > 0 &&
    statement.examples.some(
      (ex) =>
        ex.output &&
        ex.output !== "See problem description" &&
        ex.output !== "Output evaluated upon submission"
    );

  return (
    <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar bg-bb-surface [&_.katex]:text-current">
      {/* Platform Header */}
      <div className="sticky top-0 z-10 px-5 pt-4 pb-3.5 border-b border-bb-line bg-bb-surface/95 backdrop-blur-md">
        <div className="flex items-center justify-between gap-3 mb-2">
          <div className="flex items-center gap-2">
            <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase border ${
              platform.isLc ? "bg-amber-500/10 text-amber-400 border-amber-500/30" : "bg-cyan-500/10 text-cyan-400 border-cyan-500/30"
            }`}>
              <span className="w-1.5 h-1.5 rounded-full bg-current" />
              {platform.name}
            </span>
            <span className="text-[11px] font-mono text-bb-ink-faint">
              {statement.contestId > 0 ? `${statement.contestId}${statement.index}` : statement.key}
            </span>
          </div>

          {/* External Problem Link */}
          <a
            href={platform.url}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => playSound("click")}
            className="text-[11px] font-mono text-bb-ink-soft hover:text-bb-yellow transition-colors flex items-center gap-1"
          >
            Open on {platform.name} ↗
          </a>
        </div>

        <h3 className="text-xl font-display font-bold text-bb-ink tracking-tight mb-3">
          {statement.title ?? statement.key}
        </h3>

        {/* Platform Metadata Badges */}
        <div className="flex items-center gap-2 flex-wrap">
          {platform.isLc ? (
            <>
              <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold border ${
                (statement.difficulty?.toLowerCase() === "easy" || (!statement.difficulty && statement.rating != null && statement.rating < 1400))
                  ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
                  : (statement.difficulty?.toLowerCase() === "hard" || (!statement.difficulty && statement.rating != null && statement.rating >= 1900))
                  ? "bg-rose-500/10 text-rose-400 border-rose-500/30"
                  : "bg-amber-500/10 text-amber-400 border-amber-500/30"
              }`}>
                {statement.difficulty
                  ? statement.difficulty.charAt(0).toUpperCase() + statement.difficulty.slice(1).toLowerCase()
                  : (statement.rating != null
                      ? (statement.rating < 1400 ? "Easy" : statement.rating < 1900 ? "Medium" : "Hard")
                      : "Easy")}
              </span>
              {statement.rating && (
                <span className="px-2 py-0.5 rounded text-[11px] font-mono font-bold bg-bb-ground border border-bb-line text-bb-ink">
                  {statement.rating}
                </span>
              )}
            </>
          ) : (
            <span className={`px-2.5 py-0.5 rounded font-mono text-xs font-bold border ${cfRank.color}`}>
              {cfRank.rank} {statement.rating ? `(${statement.rating})` : ""}
            </span>
          )}

          {statement.tags.map((tag) => (
            <span key={tag} className="px-2 py-0.5 rounded text-[11px] font-mono bg-bb-ground border border-bb-line text-bb-ink-soft">
              {tag}
            </span>
          ))}
        </div>

        {/* Codeforces Constraints Bar */}
        {!platform.isLc && (
          <div className="flex items-center gap-4 px-3 py-2 rounded bg-bb-ground/60 border border-bb-line text-[11px] font-mono text-bb-ink-soft mt-3">
            <div>
              <span className="text-bb-ink-faint">time limit:</span>{" "}
              <span className="font-semibold text-bb-ink">{statement.timeLimitMs ? statement.timeLimitMs / 1000 : 2}s</span>
            </div>
            <div className="w-px h-3 bg-bb-line" />
            <div>
              <span className="text-bb-ink-faint">memory limit:</span>{" "}
              <span className="font-semibold text-bb-ink">{statement.memoryLimitMb || 256}MB</span>
            </div>
            {statement.judgeable && (
              <>
                <div className="w-px h-3 bg-bb-line" />
                <div className="text-bb-yellow font-medium">✓ Judgeable</div>
              </>
            )}
          </div>
        )}
      </div>

      {/* Main Statement Content */}
      <div className="p-5 space-y-6">
        {statement.description && (
          <div>
            <MathText text={cleanStatementText(statement.description, statement.title ?? statement.key)} />
          </div>
        )}

        {!platform.isLc && statement.inputFormat && (
          <Section title="Input Format">
            <MathText text={statement.inputFormat} />
          </Section>
        )}

        {!platform.isLc && statement.outputFormat && (
          <Section title="Output Format">
            <MathText text={statement.outputFormat} />
          </Section>
        )}

        {hasValidSampleCases && (
          <Section title="Sample Test Cases">
            <div className="space-y-4">
              {statement.examples.map((ex, i) => (
                <div key={i} className="rounded border border-bb-line bg-bb-ground/40 overflow-hidden font-mono text-xs shadow-sm">
                  <div className="flex items-center justify-between px-3.5 py-1.5 border-b border-bb-line bg-bb-ground/80">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-bb-ink-faint">Input {i + 1}</span>
                    <CopyButton text={ex.input} />
                  </div>
                  <pre className="px-3.5 py-2.5 text-bb-ink/90 whitespace-pre-wrap max-h-56 overflow-y-auto custom-scrollbar bg-bb-surface/40">{ex.input}</pre>

                  <div className="flex items-center justify-between px-3.5 py-1.5 border-y border-bb-line bg-bb-ground/80">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-bb-ink-faint">Output {i + 1}</span>
                    <CopyButton text={ex.output} />
                  </div>
                  <pre className="px-3.5 py-2.5 text-bb-ink/90 whitespace-pre-wrap max-h-56 overflow-y-auto custom-scrollbar bg-bb-surface/40">{ex.output}</pre>
                </div>
              ))}
            </div>
          </Section>
        )}

        {!platform.isLc && statement.note && (
          <Section title="Note">
            <MathText text={statement.note} />
          </Section>
        )}

        {/* Dataset License Attribution */}
        <div className="pt-4 border-t border-bb-line text-[10px] font-mono text-bb-ink-faint leading-relaxed">
          Problem ©{" "}
          <a
            href={platform.url}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => playSound("click")}
            className="underline hover:text-bb-yellow transition-colors font-medium"
          >
            {platform.name}
          </a>{" "}
          — statement served locally via{" "}
          <a
            href={platform.datasetUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="underline hover:text-bb-yellow transition-colors font-medium"
          >
            {platform.datasetName}
          </a>.
        </div>
      </div>
    </div>
  );
};
