import { useCallback, useEffect, useRef, useState } from "react";

export type LoadState = "idle" | "loading" | "ready" | "error";

export interface UseBotDataResult<T> {
  data: T | null;
  state: LoadState;
  error: string | null;
  reload: () => void;
}

/**
 * useBotData — one loading pattern for every bot-backed page.
 *
 * Fixes two bugs the old ad-hoc fetches had: a stale response from a
 * previous tab could overwrite the current one, and an unmounted component
 * could still setState. Both are handled by the generation counter.
 *
 * `deps` behaves like a useEffect dep array — change it and the fetch reruns.
 */
export function useBotData<T>(
  fetcher: () => Promise<T>,
  deps: unknown[],
  opts?: { enabled?: boolean; pollMs?: number }
): UseBotDataResult<T> {
  const enabled = opts?.enabled ?? true;
  const [data, setData] = useState<T | null>(null);
  const [state, setState] = useState<LoadState>(enabled ? "loading" : "idle");
  const [error, setError] = useState<string | null>(null);
  const [nonce, setNonce] = useState(0);
  const gen = useRef(0);

  // Keep the latest fetcher without making it a dependency — callers pass
  // inline arrows, which would otherwise refire every render.
  const fetcherRef = useRef(fetcher);
  fetcherRef.current = fetcher;

  useEffect(() => {
    if (!enabled) {
      setState("idle");
      return;
    }
    const myGen = ++gen.current;
    setState((prev) => (prev === "ready" ? "ready" : "loading"));
    setError(null);

    fetcherRef
      .current()
      .then((res) => {
        if (myGen !== gen.current) return; // a newer request superseded this one
        setData(res);
        setState("ready");
      })
      .catch((err: unknown) => {
        if (myGen !== gen.current) return;
        setError(err instanceof Error ? err.message : "Request failed");
        setState("error");
      });

    return () => {
      // Invalidate in-flight results on unmount / dep change.
      gen.current++;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, nonce, ...deps]);

  // Optional polling — used by the live-duels strip.
  useEffect(() => {
    if (!enabled || !opts?.pollMs) return;
    const id = window.setInterval(() => setNonce((n) => n + 1), opts.pollMs);
    return () => window.clearInterval(id);
  }, [enabled, opts?.pollMs]);

  const reload = useCallback(() => setNonce((n) => n + 1), []);

  return { data, state, error, reload };
}
