import React, { useEffect } from "react";

interface Props {
  url: string;
  filename: string;
  onClose: () => void;
}

export const PdfViewerModal: React.FC<Props> = ({ url, filename, onClose }) => {
  const googleDocsViewerUrl = `https://docs.google.com/gview?url=${encodeURIComponent(url)}&embedded=true`;

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
          <a
            href={url}
            target="_blank"
            rel="noreferrer"
            className="rounded border-[1.5px] border-bb-yellow bg-bb-yellow px-3 py-1.5 font-mono text-[11px] uppercase tracking-wider text-bb-ground font-bold transition-colors"
          >
            Open Tab ↗
          </a>
          <button
            onClick={onClose}
            className="rounded border-[1.5px] border-bb-line-strong px-3 py-1.5 font-mono text-[11px] uppercase tracking-wider text-bb-ink-soft hover:border-bb-yellow hover:text-bb-yellow transition-colors cursor-pointer"
          >
            Close [ESC]
          </button>
        </div>
      </div>

      <div
        className="min-h-0 flex-1 overflow-hidden rounded border-[1.5px] border-bb-line-strong bg-bb-surface"
        onClick={(e) => e.stopPropagation()}
      >
        <iframe
          src={googleDocsViewerUrl}
          title={filename}
          className="h-full w-full border-0"
        />
      </div>
    </div>
  );
};
