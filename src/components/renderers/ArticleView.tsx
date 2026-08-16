import React from "react";
import type { DiscordMessage } from "../../lib/botApi";
import { renderMarkdown } from "../discord/DiscordMessageCard";
import { Panel } from "../ui/Panel";
import { Eyebrow } from "../ui/Eyebrow";

/**
 * ArticleView — renders Maths Lounge / Algorithmic Theory posts as
 * structured article cards instead of raw Discord message dumps.
 *
 * Each message becomes a card with:
 *  - extracted title (from first heading or first bold text)
 *  - body with proper code block rendering, bold, links etc.
 *  - reference links at the bottom
 *  - author + timestamp meta
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
  return new Date(iso).toLocaleDateString(undefined, {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

/** Extract a title from the content — first line that starts with a heading
 *  or first bolded phrase, falling back to first non-empty line. */
function extractTitle(content: string): { title: string; body: string } {
  const lines = content.split("\n");
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    // Markdown heading
    const hMatch = line.match(/^#{1,3}\s+(.+)$/);
    if (hMatch) {
      return {
        title: hMatch[1].replace(/\*\*/g, "").trim(),
        body: lines.slice(i + 1).join("\n").trim(),
      };
    }

    // Bold line (the Discord forum title pattern)
    // Match patterns like "Today's CP Concept: Bellman-Ford Algorithm"
    if (/^\*\*/.test(line) || /^__/.test(line)) {
      const clean = line.replace(/^\*\*|\*\*$|^__|__$/g, "").trim();
      if (clean.length > 3) {
        return {
          title: clean,
          body: lines.slice(i + 1).join("\n").trim(),
        };
      }
    }

    // Plain first line if it looks like a title (short, no code fence)
    if (line.length < 100 && !line.startsWith("```") && !line.startsWith("//")) {
      return {
        title: line.replace(/\*\*/g, "").replace(/__/g, "").trim(),
        body: lines.slice(i + 1).join("\n").trim(),
      };
    }
  }
  return { title: "Untitled", body: content };
}

/** Extract reference URLs from content. */
function extractLinks(content: string): { label: string; url: string }[] {
  const links: { label: string; url: string }[] = [];
  const re = /\[([^\]]+)\]\((https?:\/\/[^)]+)\)/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(content))) {
    links.push({ label: m[1], url: m[2] });
  }
  // Bare URLs with labels from surrounding context
  const bare = /(?:^|\s)(https?:\/\/\S+)/gm;
  while ((m = bare.exec(content))) {
    if (!links.some((l) => l.url === m![1])) {
      try {
        const host = new URL(m[1]).hostname.replace("www.", "");
        links.push({ label: host, url: m[1] });
      } catch {
        // skip malformed
      }
    }
  }
  return links;
}

/** Count "Topic N:" sections for the topic badge count. */
function countTopics(content: string): number {
  return (content.match(/Topic\s+\d+/gi) ?? []).length;
}

interface ArticleCardProps {
  message: DiscordMessage;
}

const ArticleCard: React.FC<ArticleCardProps> = ({ message }) => {
  const { title, body } = extractTitle(message.content);
  const links = extractLinks(message.content);
  const topics = countTopics(message.content);

  return (
    <Panel className="flex flex-col gap-0 overflow-hidden">
      {/* Header band */}
      <div className="border-b border-bb-line bg-bb-surface-2/50 px-5 py-4">
        <div className="flex flex-wrap items-center gap-2">
          {topics > 0 && (
            <span className="rounded border-[1px] border-bb-yellow/30 bg-bb-yellow/10 px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.14em] text-bb-yellow">
              {topics} topic{topics > 1 ? "s" : ""}
            </span>
          )}
          <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-bb-ink-faint">
            {relative(message.created_at)}
          </span>
          {message.author_name && (
            <span className="font-mono text-[10px] text-bb-ink-faint">
              · {message.author_name}
            </span>
          )}
        </div>
        <h3 className="mt-2 font-display text-lg font-bold uppercase leading-snug tracking-tight text-bb-ink sm:text-xl">
          {title}
        </h3>
      </div>

      {/* Body */}
      <div className="px-5 py-4">
        <div className="article-body">{renderMarkdown(body)}</div>
      </div>

      {/* Reference links */}
      {links.length > 0 && (
        <div className="border-t border-bb-line px-5 py-3">
          <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-bb-ink-faint">
            References
          </span>
          <div className="mt-1.5 flex flex-wrap gap-2">
            {links.slice(0, 5).map((link, i) => (
              <a
                key={i}
                href={link.url}
                target="_blank"
                rel="noreferrer"
                className="rounded border-[1px] border-bb-line-strong bg-bb-surface-2 px-2.5 py-1 font-mono text-[11px] text-bb-yellow transition-colors hover:border-bb-yellow"
              >
                {link.label}
              </a>
            ))}
          </div>
        </div>
      )}

      {/* Attachments (images) */}
      {message.attachments?.filter((a) => a.is_image).length > 0 && (
        <div className="border-t border-bb-line px-5 py-3">
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {message.attachments
              .filter((a) => a.is_image)
              .map((a) => (
                <img
                  key={a.id}
                  src={a.url}
                  alt={a.filename}
                  loading="lazy"
                  className="w-full rounded border-[1px] border-bb-line object-cover"
                />
              ))}
          </div>
        </div>
      )}
    </Panel>
  );
};

interface Props {
  messages: DiscordMessage[];
}

export const ArticleView: React.FC<Props> = ({ messages }) => {
  // Group by threads if available, otherwise show as flat list.
  // For maths-lounge, each forum post is the "first" message in a thread.
  // Messages are newest-first from the API.
  const sorted = [...messages].sort(
    (a, b) =>
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );

  // Deduplicate: if we have thread starters, prefer those.
  // The API may return both the thread-start message and regular channel messages.
  const seen = new Set<string>();
  const unique = sorted.filter((m) => {
    if (seen.has(m.message_id)) return false;
    seen.add(m.message_id);
    // Skip very short messages (reactions, system messages)
    return m.content.trim().length > 40;
  });

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-8">
      <div className="text-center">
        <p className="font-hud text-[11px] uppercase tracking-[0.25em] text-bb-yellow">
          Binary Beats
        </p>
        <h1 className="mt-1 font-display text-2xl font-bold uppercase tracking-tight text-bb-ink sm:text-3xl">
          Algorithmic Theory
        </h1>
        <p className="mt-1 text-[13px] text-bb-ink-faint">
          Long-form articles on the maths and algorithms behind competitive
          programming
        </p>
      </div>

      {unique.length === 0 ? (
        <Panel className="p-8 text-center">
          <p className="text-[14px] text-bb-ink-soft">
            No articles synced yet. Run{" "}
            <code className="rounded bg-bb-surface-2 px-1.5 py-0.5 font-mono text-[12px] text-bb-yellow">
              !syncchannel maths_lounge
            </code>{" "}
            in Discord to backfill.
          </p>
        </Panel>
      ) : (
        <div className="flex flex-col gap-5">
          {unique.map((m) => (
            <ArticleCard key={m.message_id} message={m} />
          ))}
        </div>
      )}
    </div>
  );
};
