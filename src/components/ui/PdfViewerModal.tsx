import React, { useEffect, useState } from "react";

/**
 * Inline PDF viewer modal.
 *
 * Why not just `<a href={url} target="_blank">`?
 * Discord CDN attachment URLs are frequently served with
 * `Content-Disposition: attachment`, which makes the browser download the
 * file instead of rendering it — regardless of `target="_blank"`. Pointing
 * an <iframe> straight at that URL has the same problem in Chrome/Edge.
 *
 * The fix: fetch the PDF ourselves, turn it into a same-origin `blob:` URL
 * (blob URLs have no Content-Disposition header at all), and point the
 * <iframe> at that instead. The browser's native PDF viewer then renders it
 * inline no matter how the origin server wanted to serve it.
 */

interface Props {
  url: string;
  filename: string;
  onClose: () => void;
}

export const PdfViewerModal: React.FC<Props> = ({ url, filename, onClose }) => {
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    let objectUrl: string | null = null;

    (async () => {
      try {
        const res = await fetch(url);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const blob = await res.blob();
        objectUrl = URL.createObjectURL(
          blob.type === "application/pdf" ? blob : new Blob([blob], { type: "application/pdf" })
        );
        if (!cancelled) setBlobUrl(objectUrl);
      } catch {
        // CORS-blocked or network error — fall back to a direct link below
        if (!cancelled) setError(true);
      }
    })();

    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [url]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-[60] flex flex-col bg-bb-ground/95 p-3 sm:p-6"
      role="dialog"
      aria-modal="true"
    >
      <div className="flex items-center justify-between gap-3 pb-3">
        <span className="min-w-0 truncate font-mono text-[12px] uppercase tracking-[0.18em] text-bb-ink-faint">
          {filename}
        </span>
        <div className="flex shrink-0 items-center gap-2">
          <a
            href={url}
            download={filename}
            className="rounded border-[1.5px] border-bb-line-strong px-3 py-1.5 font-mono text-[11px] uppercase tracking-wider text-bb-ink-soft hover:border-bb-yellow hover:text-bb-yellow transition-colors"
          >
            Download
          </a>
          <button
            onClick={onClose}
            className="rounded border-[1.5px] border-bb-line-strong px-3 py-1.5 font-mono text-[11px] uppercase tracking-wider text-bb-ink-soft hover:border-bb-yellow hover:text-bb-yellow transition-colors"
          >
            Close
          </button>
        </div>
      </div>

      <div
        className="min-h-0 flex-1 overflow-hidden rounded border-[1.5px] border-bb-line-strong bg-bb-surface"
        onClick={(e) => e.stopPropagation()}
      >
        {error ? (
          <div className="flex h-full flex-col items-center justify-center gap-3 text-center">
            <p className="text-[13px] text-bb-ink-soft">
              Couldn't load an inline preview for this file.
            </p>
            <a
              href={url}
              target="_blank"
              rel="noreferrer"
              className="rounded border-[1.5px] border-bb-line-strong px-4 py-2 font-mono text-[11px] uppercase tracking-wider text-bb-yellow hover:border-bb-yellow transition-colors"
            >
              Open in new tab
            </a>
          </div>
        ) : blobUrl ? (
          <iframe src={blobUrl} title={filename} className="h-full w-full" />
        ) : (
          <div className="flex h-full items-center justify-center">
            <span className="font-mono text-[12px] uppercase tracking-wider text-bb-ink-faint">
              Loading preview…
            </span>
          </div>
        )}
      </div>
    </div>
  );
};
