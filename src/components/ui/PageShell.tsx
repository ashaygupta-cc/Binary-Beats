import React from "react";
import { Eyebrow } from "./Eyebrow";
import { Panel } from "./Panel";
import { Button } from "./Button";

/* Page-level primitives shared by every module page. All of these use only
   existing tokens — no new colors, no blur, no rounded-xl. The point is that
   a new page written against these is visually indistinguishable from the
   pages that shipped first. */

interface PageHeaderProps {
  number: string;
  title: string;
  blurb?: string;
  /** Right-aligned slot — filters, a Join button, a count. */
  aside?: React.ReactNode;
}

export const PageHeader: React.FC<PageHeaderProps> = ({ number, title, blurb, aside }) => (
  <header className="w-full border-b-[1.5px] border-bb-line-strong">
    <div className="mx-auto w-full max-w-[1400px] px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div className="min-w-0">
          <Eyebrow number={number}>Binary Beats</Eyebrow>
          <h1 className="mt-2 font-display text-[clamp(1.75rem,6vw,3rem)] font-extrabold uppercase leading-[0.95] tracking-tight text-bb-ink">
            {title}
          </h1>
          {blurb && (
            <p className="mt-2 max-w-prose text-[13px] leading-relaxed text-bb-ink-soft">
              {blurb}
            </p>
          )}
        </div>
        {aside && <div className="shrink-0">{aside}</div>}
      </div>
    </div>
  </header>
);

/** Standard page body wrapper — consistent gutters at every breakpoint.
 *  The px-4 floor is what stops the horizontal scroll on small phones. */
export const PageBody: React.FC<{ children: React.ReactNode; className?: string }> = ({
  children,
  className = "",
}) => (
  <div className={`mx-auto w-full max-w-[1400px] px-4 sm:px-6 lg:px-8 py-6 sm:py-8 ${className}`}>
    {children}
  </div>
);

/** Skeleton row — sized to the real content so the page doesn't jump. */
export const SkeletonRows: React.FC<{ rows?: number; height?: string }> = ({
  rows = 6,
  height = "h-14",
}) => (
  <div className="flex flex-col gap-2" aria-hidden>
    {Array.from({ length: rows }).map((_, i) => (
      <div
        key={i}
        className={`${height} w-full rounded border-[1.5px] border-bb-line bg-bb-surface skeleton-pulse`}
        style={{ animationDelay: `${i * 60}ms` }}
      />
    ))}
  </div>
);

interface EmptyStateProps {
  title: string;
  body?: string;
  action?: React.ReactNode;
}

export const EmptyState: React.FC<EmptyStateProps> = ({ title, body, action }) => (
  <Panel className="p-8 text-center">
    <p className="font-display text-xl font-bold uppercase tracking-tight text-bb-ink">{title}</p>
    {body && <p className="mt-2 text-[13px] text-bb-ink-soft">{body}</p>}
    {action && <div className="mt-4 flex justify-center">{action}</div>}
  </Panel>
);

interface ErrorStateProps {
  message: string;
  onRetry?: () => void;
}

export const ErrorState: React.FC<ErrorStateProps> = ({ message, onRetry }) => (
  <Panel className="p-6 sm:p-8 text-center border-bb-danger">
    <p className="font-mono text-[11px] font-bold uppercase tracking-[0.18em] text-bb-danger">
      Request failed
    </p>
    <p className="mt-2 break-words text-[13px] text-bb-ink-soft">{message}</p>
    {onRetry && (
      <div className="mt-4 flex justify-center">
        <Button variant="outline" size="sm" onClick={onRetry}>
          Retry
        </Button>
      </div>
    )}
  </Panel>
);

/**
 * DataState — collapses the loading/error/empty/ready fork that every page
 * repeated slightly differently before.
 */
export function DataState<T>({
  state,
  error,
  data,
  isEmpty,
  onRetry,
  skeleton,
  empty,
  children,
}: {
  state: "idle" | "loading" | "ready" | "error";
  error: string | null;
  data: T | null;
  isEmpty?: (d: T) => boolean;
  onRetry?: () => void;
  skeleton?: React.ReactNode;
  empty?: React.ReactNode;
  children: (d: T) => React.ReactNode;
}): React.ReactElement | null {
  if (state === "error") return <ErrorState message={error ?? "Unknown error"} onRetry={onRetry} />;
  if (state === "loading" || (state !== "ready" && !data)) {
    return <>{skeleton ?? <SkeletonRows />}</>;
  }
  if (!data) return null;
  if (isEmpty?.(data)) {
    return <>{empty ?? <EmptyState title="Nothing here yet" />}</>;
  }
  return <>{children(data)}</>;
}
