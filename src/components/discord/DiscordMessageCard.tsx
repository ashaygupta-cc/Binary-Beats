import React, { useState } from "react";
import { Panel } from "../ui/Panel";
import { Tag } from "../ui/Tag";
import { PdfViewerModal } from "../ui/PdfViewerModal";
import type { DiscordMessage, DiscordEmbed, DiscordAttachment } from "../../lib/botApi";

/* Renders a mirrored Discord message as a Binary Beats card — not as a chat
   bubble. Embeds keep their accent colour as a left rule only; everything
   else uses existing tokens, so a contest reminder and a hand-written update
   sit in the same visual system. */

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
  return new Date(iso).toLocaleDateString(undefined, { day: "2-digit", month: "short", year: "numeric" });
}

/** Discord markdown → React. Deliberately small: bold, italic, inline code,
 *  strikethrough, links, headings, blockquotes, bullets and fenced code.
 *  Anything else renders as text rather than risking mangled output. */
export function renderMarkdown(input: string): React.ReactNode[] {
  const blocks: React.ReactNode[] = [];
  const fence = /```(\w+)?\n?([\s\S]*?)```/g;
  let last = 0;
  let m: RegExpExecArray | null;
  let k = 0;

  const pushText = (text: string) => {
    for (const line of text.split("\n")) {
      if (!line.trim()) continue;
      const heading = line.match(/^(#{1,3})\s+(.*)$/);
      if (heading) {
        const level = heading[1].length;
        blocks.push(
          <p
            key={k++}
            className={`mt-3 font-display font-bold uppercase tracking-tight text-bb-ink ${
              level === 1 ? "text-xl" : level === 2 ? "text-lg" : "text-base"
            }`}
          >
            {inline(heading[2])}
          </p>
        );
        continue;
      }
      if (/^>\s?/.test(line)) {
        blocks.push(
          <p key={k++} className="mt-2 border-l-2 border-bb-yellow pl-3 text-[13px] italic text-bb-ink-soft">
            {inline(line.replace(/^>\s?/, ""))}
          </p>
        );
        continue;
      }
      if (/^[-*•]\s+/.test(line)) {
        blocks.push(
          <p key={k++} className="mt-1 flex gap-2 text-[13px] leading-relaxed text-bb-ink-soft">
            <span className="text-bb-yellow">▪</span>
            <span className="min-w-0">{inline(line.replace(/^[-*•]\s+/, ""))}</span>
          </p>
        );
        continue;
      }
      blocks.push(
        <p key={k++} className="mt-2 text-[13px] leading-relaxed text-bb-ink-soft">
          {inline(line)}
        </p>
      );
    }
  };

  while ((m = fence.exec(input))) {
    pushText(input.slice(last, m.index));
    blocks.push(
      <pre
        key={k++}
        className="mt-3 overflow-x-auto rounded border-[1.5px] border-bb-line-strong bg-bb-surface p-3 font-mono text-[12px] leading-relaxed text-bb-ink"
      >
        <code>{m[2].trimEnd()}</code>
      </pre>
    );
    last = m.index + m[0].length;
  }
  pushText(input.slice(last));
  return blocks;
}

/** Clean Discord-specific markup before rendering. */
function cleanDiscord(text: string): string {
  let cleaned = text;
  // Replace <@!id> and <@id> user mentions → @member
  cleaned = cleaned.replace(/<@!?(\d+)>/g, "@member");
  // Replace <@&id> role mentions → @role
  cleaned = cleaned.replace(/<@&\d+>/g, "@everyone");
  // Replace <#id> channel mentions → #channel
  cleaned = cleaned.replace(/<#\d+>/g, "#channel");
  // Replace custom emoji <:name:id> or <a:name:id> → :name:
  cleaned = cleaned.replace(/<a?:(\w+):\d+>/g, ":$1:");
  // Replace Discord timestamps <t:123:R> → readable time
  cleaned = cleaned.replace(/<t:(\d+)(?::[tTdDfFR])?>/g, (_match, ts) => {
    try {
      return new Date(parseInt(ts) * 1000).toLocaleString(undefined, {
        day: "numeric",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return "";
    }
  });
  return cleaned;
}

/** Inline spans within a single line. */
function inline(text: string): React.ReactNode[] {
  const cleaned = cleanDiscord(text);
  const out: React.ReactNode[] = [];
  // Extended regex: bold (**), underline (__), italic (*), strikethrough (~~),
  // inline code (`), markdown links, and bare URLs.
  const re = /(\*\*[^*]+\*\*|__[^_]+__|~~[^~]+~~|\*[^*]+\*|`[^`]+`|\[[^\]]+\]\([^)]+\)|https?:\/\/\S+)/g;
  let last = 0;
  let m: RegExpExecArray | null;
  let k = 0;
  while ((m = re.exec(cleaned))) {
    if (m.index > last) out.push(cleaned.slice(last, m.index));
    const t = m[0];
    if (t.startsWith("**")) {
      out.push(<strong key={k++} className="font-semibold text-bb-ink">{inline(t.slice(2, -2))}</strong>);
    } else if (t.startsWith("__")) {
      out.push(<span key={k++} className="underline decoration-bb-yellow/40 underline-offset-2 font-semibold text-bb-ink">{inline(t.slice(2, -2))}</span>);
    } else if (t.startsWith("~~")) {
      out.push(<s key={k++} className="text-bb-ink-faint">{t.slice(2, -2)}</s>);
    } else if (t.startsWith("`")) {
      out.push(
        <code key={k++} className="rounded bg-bb-surface px-1 py-0.5 font-mono text-[12px] text-bb-ink">
          {t.slice(1, -1)}
        </code>
      );
    } else if (t.startsWith("[")) {
      const lm = t.match(/\[([^\]]+)\]\(([^)]+)\)/);
      if (lm) {
        out.push(
          <a key={k++} href={lm[2]} target="_blank" rel="noreferrer"
             className="text-bb-yellow underline underline-offset-2 hover:opacity-80 break-words">
            {lm[1]}
          </a>
        );
      }
    } else if (t.startsWith("http")) {
      out.push(
        <a key={k++} href={t} target="_blank" rel="noreferrer"
           className="break-all text-bb-yellow underline underline-offset-2 hover:opacity-80">
          {t}
        </a>
      );
    } else if (t.startsWith("*")) {
      out.push(<em key={k++}>{t.slice(1, -1)}</em>);
    }
    last = m.index + t.length;
  }
  if (last < cleaned.length) out.push(cleaned.slice(last));
  return out;
}

const EmbedCard: React.FC<{ embed: DiscordEmbed }> = ({ embed }) => {
  const accent = embed.color != null
    ? `#${embed.color.toString(16).padStart(6, "0")}`
    : "var(--bb-yellow)";
  return (
    <div
      className="mt-3 rounded border-[1.5px] border-bb-line-strong bg-bb-surface p-3 sm:p-4"
      style={{ borderLeftWidth: 4, borderLeftColor: accent }}
    >
      {embed.author?.name && (
        <div className="flex items-center gap-2">
          {embed.author.icon_url && (
            <img src={embed.author.icon_url} alt="" className="h-5 w-5 rounded-full" />
          )}
          <span className="font-mono text-[11px] uppercase tracking-wider text-bb-ink-faint">
            {embed.author.name}
          </span>
        </div>
      )}

      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 flex-1">
          {embed.title && (
            <p className="mt-1.5 font-display text-[15px] font-bold leading-snug text-bb-ink sm:text-base">
              {embed.url ? (
                <a href={embed.url} target="_blank" rel="noreferrer" className="hover:text-bb-yellow">
                  {embed.title}
                </a>
              ) : (
                embed.title
              )}
            </p>
          )}
          {embed.description && <div className="min-w-0">{renderMarkdown(embed.description)}</div>}
        </div>

        {embed.thumbnail?.url && (
          <img
            src={embed.thumbnail.url}
            alt=""
            className="h-16 w-16 shrink-0 rounded border border-bb-line object-cover sm:h-20 sm:w-20"
          />
        )}
      </div>

      {embed.fields && embed.fields.length > 0 && (
        <div className="mt-3 grid grid-cols-1 gap-x-4 gap-y-2 sm:grid-cols-2 lg:grid-cols-3">
          {embed.fields.map((f, i) => (
            <div key={i} className={f.inline ? "" : "sm:col-span-2 lg:col-span-3"}>
              <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-bb-ink-faint">
                {f.name}
              </p>
              <div className="mt-0.5 text-[13px] text-bb-ink-soft">{inline(f.value)}</div>
            </div>
          ))}
        </div>
      )}

      {embed.image?.url && (
        <img
          src={embed.image.url}
          alt=""
          loading="lazy"
          className="mt-3 w-full rounded border border-bb-line object-cover"
        />
      )}

      {embed.footer?.text && (
        <p className="mt-3 border-t border-bb-line pt-2 font-mono text-[10px] uppercase tracking-[0.18em] text-bb-ink-faint">
          {embed.footer.text}
        </p>
      )}
    </div>
  );
};

const Attachments: React.FC<{ files: DiscordAttachment[] }> = ({ files }) => {
  const [lightbox, setLightbox] = useState<string | null>(null);
  const [pdfPreview, setPdfPreview] = useState<DiscordAttachment | null>(null);
  const images = files.filter((f) => f.is_image);
  const pdfs = files.filter((f) => f.is_pdf);
  const others = files.filter((f) => !f.is_image && !f.is_pdf);

  return (
    <>
      {images.length > 0 && (
        <div className={`mt-3 grid gap-2 ${images.length > 1 ? "grid-cols-2" : "grid-cols-1"}`}>
          {images.map((f) => (
            <button
              key={f.id}
              onClick={() => setLightbox(f.url)}
              className="cursor-pointer overflow-hidden rounded border-[1.5px] border-bb-line-strong"
            >
              <img src={f.url} alt={f.filename} loading="lazy" className="w-full object-cover" />
            </button>
          ))}
        </div>
      )}

      {/* PDFs open inline in a viewer modal instead of downloading */}
      {pdfs.map((f) => (
        <button
          key={f.id}
          onClick={() => setPdfPreview(f)}
          className="mt-2 flex w-full items-center gap-3 rounded border-[1.5px] border-bb-line-strong bg-bb-surface p-3 text-left transition-colors hover:border-bb-yellow"
        >
          <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-bb-yellow">PDF</span>
          <span className="min-w-0 flex-1 truncate text-[13px] text-bb-ink">{f.filename}</span>
          <span className="shrink-0 font-mono text-[11px] text-bb-ink-faint">
            {(f.size / 1024).toFixed(0)} KB
          </span>
        </button>
      ))}

      {others.map((f) => (
        <a
          key={f.id}
          href={f.url}
          target="_blank"
          rel="noreferrer"
          className="mt-2 flex items-center gap-3 rounded border-[1.5px] border-bb-line-strong bg-bb-surface p-3 transition-colors hover:border-bb-ink"
        >
          <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-bb-yellow">
            {(f.filename.split(".").pop() ?? "FILE").toUpperCase()}
          </span>
          <span className="min-w-0 flex-1 truncate text-[13px] text-bb-ink">{f.filename}</span>
          <span className="shrink-0 font-mono text-[11px] text-bb-ink-faint">
            {(f.size / 1024).toFixed(0)} KB
          </span>
        </a>
      ))}

      {lightbox && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-bb-ground/95 p-4"
          onClick={() => setLightbox(null)}
          role="dialog"
        >
          <img src={lightbox} alt="" className="max-h-[90dvh] max-w-full rounded border-[1.5px] border-bb-line-strong object-contain" />
        </div>
      )}

      {pdfPreview && (
        <PdfViewerModal
          url={pdfPreview.url}
          filename={pdfPreview.filename}
          onClose={() => setPdfPreview(null)}
        />
      )}
    </>
  );
};

interface Props {
  message: DiscordMessage;
  /** Hide the author row for channels where it's always the same bot. */
  hideAuthor?: boolean;
}

export const DiscordMessageCard: React.FC<Props> = ({ message, hideAuthor }) => (
  <Panel className="p-4 sm:p-5">
    {!hideAuthor && (
      <div className="flex flex-wrap items-center gap-2">
        {message.author_avatar && (
          <img src={message.author_avatar} alt="" className="h-6 w-6 rounded-full border border-bb-line" />
        )}
        <span className="text-[13px] font-semibold text-bb-ink">{message.author_name}</span>
        {message.author_is_bot && <Tag tone="neutral">bot</Tag>}
        {message.is_pinned && <Tag tone="accent">pinned</Tag>}
        <span className="ml-auto font-mono text-[10px] uppercase tracking-[0.18em] text-bb-ink-faint">
          {relative(message.created_at)}
          {message.edited_at && " · edited"}
        </span>
      </div>
    )}

    {message.content && <div className="min-w-0">{renderMarkdown(message.content)}</div>}
    {message.embeds?.map((e, i) => <EmbedCard key={i} embed={e} />)}
    {message.attachments?.length > 0 && <Attachments files={message.attachments} />}
  </Panel>
);
