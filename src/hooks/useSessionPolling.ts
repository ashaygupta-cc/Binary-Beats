import { useCallback, useEffect, useState } from "react";
import { BlitzApiError, getSession } from "../lib/blitzApi";
import type { BlitzSession } from "../lib/blitzSession";

export type PollState = "live" | "paused" | "backoff";

const BASE_INTERVAL_MS = 4_000;
const MAX_INTERVAL_MS = 20_000;

export interface UseSessionPollingResult {
  session: BlitzSession | null;
  pollState: PollState;
  /** True once the server reports the session no longer exists (expired/swept). */
  notFound: boolean;
  /** Fetch the session immediately (e.g. right after an in-app AC) instead of waiting for the next poll. */
  refetch: () => Promise<void>;
}

/**
 * Polls our own backend (not Codeforces directly) for the current state of a
 * server-tracked Blitz/Duel session. Cheap enough that we don't need to be as
 * conservative as the old direct-to-Codeforces polling — the server is doing
 * that work continuously regardless of whether this hook is even mounted.
 */
export function useSessionPolling(sessionId: string | null): UseSessionPollingResult {
  const [session, setSession] = useState<BlitzSession | null>(null);
  const [pollState, setPollState] = useState<PollState>("live");
  const [notFound, setNotFound] = useState(false);

  const refetch = useCallback(async () => {
    if (!sessionId) return;
    try {
      const fresh = await getSession(sessionId);
      setSession(fresh);
    } catch (e) {
      if (e instanceof BlitzApiError && e.kind === "NOT_FOUND") setNotFound(true);
      // other errors: the regular poll loop will retry on its own cadence
    }
  }, [sessionId]);

  useEffect(() => {
    setSession(null);
    setNotFound(false);
    if (!sessionId) return;

    let cancelled = false;
    let timeoutId: ReturnType<typeof setTimeout> | null = null;
    let intervalMs = BASE_INTERVAL_MS;
    let inFlight = false;

    function scheduleNext() {
      if (timeoutId) clearTimeout(timeoutId);
      timeoutId = setTimeout(tick, intervalMs);
    }

    async function tick() {
      if (cancelled || inFlight) return;
      if (document.visibilityState !== "visible") {
        setPollState("paused");
        scheduleNext();
        return;
      }

      inFlight = true;
      let shouldContinue = true;
      try {
        const fresh = await getSession(sessionId as string);
        if (cancelled) return;
        setSession(fresh);
        intervalMs = BASE_INTERVAL_MS;
        setPollState("live");
        if (fresh.status === "finished") shouldContinue = false; // nothing left to watch
      } catch (e) {
        if (cancelled) return;
        if (e instanceof BlitzApiError && e.kind === "NOT_FOUND") {
          setNotFound(true);
          shouldContinue = false;
        } else {
          intervalMs = Math.min(intervalMs * 2, MAX_INTERVAL_MS);
          setPollState("backoff");
        }
      } finally {
        inFlight = false;
        if (!cancelled && shouldContinue) scheduleNext();
      }
    }

    function handleWake() {
      if (document.visibilityState === "visible") tick();
    }

    document.addEventListener("visibilitychange", handleWake);
    window.addEventListener("focus", handleWake);

    tick();

    return () => {
      cancelled = true;
      if (timeoutId) clearTimeout(timeoutId);
      document.removeEventListener("visibilitychange", handleWake);
      window.removeEventListener("focus", handleWake);
    };
  }, [sessionId]);

  return { session, pollState, notFound, refetch };
}
