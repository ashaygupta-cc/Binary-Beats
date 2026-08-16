import React, { useState } from "react";
import type { DiscordMessage } from "../../lib/botApi";
import { renderMarkdown } from "../discord/DiscordMessageCard";
import { Panel } from "../ui/Panel";
import { Tag } from "../ui/Tag";

/**
 * NoticeBoard — bento-grid of short clickable notice cards.
 *
 * Layout (Excalidraw wireframe):
 *  ┌────────────────────────────────────────┐  ← featured (full width)
 *  ├────────────────────┬───────────────────┤
 *  │  notice 2          │  notice 3         │  ← 2-col
 *  ├──────────┬─────────┼───────────────────┤
 *  │  notice4 │ notice5 │  notice 6         │  ← 3-col
 *  └──────────┴─────────┴───────────────────┘
 *
 * Each card: type badge + timestamp + title only. Click → expand full content.
 */

function relative(iso: string | null): string {
  if (!iso) return "";
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60_000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 30) return `${d}d ago`;
  return new Date(iso).toLocaleDateString(undefined, { day: "2-digit", month: "short" });
}

function cleanContent(content: string): string {
  return content
    .replace(/<@!?\d+>/g, "@member")
    .replace(/<@&\d+>/g, "@everyone")
    .replace(/<#\d+>/g, "#channel")
    .replace(/<a?:\w+:\d+>/g, "")
    .replace(/<t:\d+(?::[tTdDfFR])?>/g, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function extractTitle(content: string): string {
  const cleaned = cleanContent(content);
  for (const line of cleaned.split("\n")) {
    const t = line.trim();
    if (!t) continue;
    const h = t.match(/^#{1,3}\s+(.+)$/);
    if (h) return h[1].replace(/\*\*/g, "").slice(0, 80);
    if (/^\*\*/.test(t)) return t.replace(/\*\*/g, "").slice(0, 80);
    return t.replace(/\*\*/g, "").replace(/__/g, "").slice(0, 80);
  }
  return "Notice";
}

function noticeType(
  content: string,
  channelKey: string
): { label: string; tone: "accent" | "success" | "warning" | "neutral" } {
  const t = content.toLowerCase();
  if (channelKey === "updates_official" || t.includes("announcement"))
    return { label: "Official", tone: "accent" };
  if (t.includes("update") || t.includes("shipped") || t.includes("new"))
    return { label: "Update", tone: "success" };
  if (t.includes("contest") || t.includes("competition"))
    return { label: "Competition", tone: "warning" };
  return { label: "Notice", tone: "neutral" };
}

const ACCENT_BORDER: Record<string, string> = {
  accent: "border-l-bb-yellow",
  success: "border-l-bb-success",
  warning: "border-l-bb-warning",
  neutral: "border-l-bb-rival",
};

const NoticeCard: React.FC<{ message: DiscordMessage; featured?: boolean }> = ({ message, featured }) => {
  const [expanded, setExpanded] = useState(false);
  const title = extractTitle(message.content);
  const { label, tone } = noticeType(message.content, message.channel_key);
  const cleaned = cleanContent(message.content);

  return (
    <>
      <Panel
        lift
        className={`cursor-pointer border-l-4 transition-all ${ACCENT_BORDER[tone]} ${featured ? "p-5" : "p-3"}`}
        role="button" tabIndex={0}
        onClick={() => setExpanded(true)}
        onKeyDown={(e) => { if (e.key === "Enter") setExpanded(true); }}
      >
        <div className="flex items-center gap-2">
          <Tag tone={tone}>{label}</Tag>
          <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-bb-ink-faint">
            {relative(message.created_at)}
          </span>
          {message.is_pinned && <span className="text-[10px] text-bb-yellow">📌</span>}
          <span className="ml-auto font-mono text-[12px] text-bb-ink-faint">+</span>
        </div>
        <h4 className={`mt-1.5 font-display font-bold uppercase tracking-tight text-bb-ink leading-snug ${
          featured ? "text-[16px]" : "text-[14px]"
        } line-clamp-1`}>
          {title}
        </h4>
      </Panel>

      {/* Floating Modal Overlay */}
      {expanded && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm"
          onClick={(e) => {
            e.stopPropagation();
            setExpanded(false);
          }}
        >
          <Panel 
            className="w-full max-w-2xl max-h-[85vh] overflow-y-auto p-6 border-[1px] border-bb-line-strong bg-bb-surface shadow-2xl relative"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close cross */}
            <button 
              className="absolute top-4 right-4 text-bb-ink-faint hover:text-bb-ink text-2xl font-semibold transition-colors focus:outline-none"
              onClick={() => setExpanded(false)}
            >
              &times;
            </button>

            {/* Header tags */}
            <div className="flex items-center gap-2 mb-3">
              <Tag tone={tone}>{label}</Tag>
              <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-bb-ink-faint">
                {relative(message.created_at)}
              </span>
              {message.is_pinned && <span className="text-[10px] text-bb-yellow">📌</span>}
            </div>

            {/* Notice Title */}
            <h3 className="font-display font-bold uppercase tracking-tight text-bb-ink text-lg sm:text-xl mb-4 leading-snug">
              {title}
            </h3>

            {/* Notice Content */}
            <div className="border-t border-bb-line pt-4 text-bb-ink text-[14px] leading-relaxed">
              <div className="min-w-0">{renderMarkdown(cleaned)}</div>
            </div>
          </Panel>
        </div>
      )}
    </>
  );
};

interface Props { messages: DiscordMessage[]; limit?: number }

export const NoticeBoard: React.FC<Props> = ({ messages, limit = 6 }) => {
  const sorted = [...messages]
    .filter((m) => m.content.trim().length > 5)
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, limit);

  if (sorted.length === 0) return null;

  const [featured, ...rest] = sorted;
  const row2 = rest.slice(0, 2);
  const row3 = rest.slice(2, 5);

  return (
    <div className="flex flex-col gap-3">
      {featured && <NoticeCard message={featured} featured />}
      {row2.length > 0 && (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {row2.map((m) => <NoticeCard key={m.message_id} message={m} />)}
        </div>
      )}
      {row3.length > 0 && (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {row3.map((m) => <NoticeCard key={m.message_id} message={m} />)}
        </div>
      )}
    </div>
  );
};
