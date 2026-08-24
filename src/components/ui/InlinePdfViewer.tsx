import React, { useState } from "react";

interface InlinePdfViewerProps {
  url: string;
  filename: string;
  className?: string;
}

export const InlinePdfViewer: React.FC<InlinePdfViewerProps> = ({
  url,
  filename,
  className = "h-[680px] w-full",
}) => {
  const [useFallback, setUseFallback] = useState(false);

  // Google Docs Viewer handles Discord CDN CORS issues seamlessly
  const googleDocsViewerUrl = `https://docs.google.com/gview?url=${encodeURIComponent(url)}&embedded=true`;

  return (
    <div className={`relative flex flex-col rounded border-[1.5px] border-bb-line-strong bg-bb-surface overflow-hidden shadow-sm ${className}`}>
      {/* Sleek Flush Top Bar */}
      <div className="flex items-center justify-between border-b-[1.5px] border-bb-line-strong bg-bb-surface-2 px-3.5 py-2.5 shrink-0 select-none">
        <div className="flex items-center gap-2 min-w-0">
          <span className="rounded border border-bb-yellow/50 bg-bb-yellow/15 px-2 py-0.5 font-mono text-[9px] font-extrabold text-bb-yellow uppercase tracking-wider">
            PDF
          </span>
          <span className="font-mono text-[12px] font-bold text-bb-ink truncate">
            {filename}
          </span>
        </div>

        {/* Flush Corner Actions */}
        <div className="flex items-center gap-2 shrink-0">
          <a
            href={url}
            download={filename}
            className="flex items-center gap-1.5 rounded border-[1.5px] border-bb-line-strong bg-bb-ground px-2.5 py-1 font-mono text-[11px] font-bold text-bb-ink-soft hover:border-bb-yellow hover:text-bb-yellow transition-all"
            title="Download PDF file"
          >
            <span>↓</span>
            <span>Download</span>
          </a>
          <a
            href={url}
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-1.5 rounded border-[1.5px] border-bb-yellow bg-bb-yellow hover:bg-yellow-400 px-3 py-1 font-mono text-[11px] font-bold text-bb-ground transition-all shadow-sm"
            title="Open PDF in new browser tab"
          >
            <span>Open in Tab</span>
            <span className="text-[12px]">↗</span>
          </a>
        </div>
      </div>

      {/* Embedded Iframe Container */}
      <div className="flex-1 w-full bg-bb-ground relative min-h-0 overflow-hidden">
        {!useFallback ? (
          <iframe
            src={googleDocsViewerUrl}
            title={filename}
            className="h-full w-full border-0 absolute inset-0"
            onError={() => setUseFallback(true)}
          />
        ) : (
          <object
            data={url}
            type="application/pdf"
            className="h-full w-full border-0 absolute inset-0"
          >
            <div className="flex h-full flex-col items-center justify-center p-6 text-center gap-3">
              <p className="font-mono text-xs text-bb-ink-soft">
                Inline PDF preview ready.
              </p>
              <a
                href={url}
                target="_blank"
                rel="noreferrer"
                className="rounded border-[1.5px] border-bb-yellow bg-bb-yellow px-4 py-2 font-mono text-xs font-bold uppercase text-bb-ground"
              >
                Open {filename} ↗
              </a>
            </div>
          </object>
        )}
      </div>
    </div>
  );
};
