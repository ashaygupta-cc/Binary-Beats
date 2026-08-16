import { useCallback, useEffect, useState } from "react";
import { CfApiError, fetchUserInfo, isValidHandleFormat, type CfUser } from "../lib/codeforces";
import { SESSION_ID_KEY } from "../lib/blitzApi";

const HANDLE_KEY = "bb_cf_handle";
const USER_CACHE_KEY = "bb_cf_user";
const USER_CACHE_TTL_MS = 6 * 60 * 60 * 1000;

type LinkStatus = "idle" | "validating" | "linked" | "error";

interface UserCache {
  user: CfUser;
  fetchedAt: number;
}

function readUserCache(): UserCache | null {
  try {
    const raw = localStorage.getItem(USER_CACHE_KEY);
    return raw ? (JSON.parse(raw) as UserCache) : null;
  } catch {
    return null;
  }
}

function writeUserCache(user: CfUser) {
  try {
    localStorage.setItem(USER_CACHE_KEY, JSON.stringify({ user, fetchedAt: Date.now() } as UserCache));
  } catch {
    // ignore quota errors
  }
}

export interface UseCfHandleResult {
  handle: string | null;
  user: CfUser | null;
  status: LinkStatus;
  error: string | null;
  linkHandle: (handle: string) => Promise<boolean>;
  unlinkHandle: () => void;
}

export function useCfHandle(): UseCfHandleResult {
  // Read synchronously on first render (not in an effect) so a returning user
  // never sees a flash of the "link your handle" empty state.
  const [handle, setHandle] = useState<string | null>(() => localStorage.getItem(HANDLE_KEY));
  const [user, setUser] = useState<CfUser | null>(() => readUserCache()?.user ?? null);
  const [status, setStatus] = useState<LinkStatus>(() => (localStorage.getItem(HANDLE_KEY) ? "linked" : "idle"));
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!handle) return;

    const cached = readUserCache();
    const isStale = !cached || Date.now() - cached.fetchedAt >= USER_CACHE_TTL_MS;
    if (!isStale) return;

    fetchUserInfo([handle])
      .then(([fresh]) => {
        if (fresh) {
          setUser(fresh);
          setStatus("linked");
          writeUserCache(fresh);
        }
      })
      .catch(() => {
        // Silent — keep showing whatever we had cached, if anything.
        if (!cached) setStatus("error");
      });
    // Only re-run when the linked handle itself changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [handle]);

  const linkHandle = useCallback(async (rawHandle: string): Promise<boolean> => {
    const trimmed = rawHandle.trim();
    if (!isValidHandleFormat(trimmed)) {
      setStatus("error");
      setError("Enter a valid Codeforces handle (letters, digits, '_', '.', '-').");
      return false;
    }

    setStatus("validating");
    setError(null);

    try {
      const [fetched] = await fetchUserInfo([trimmed]);
      if (!fetched) {
        setStatus("error");
        setError(`No Codeforces user "${trimmed}" found.`);
        return false;
      }
      localStorage.setItem(HANDLE_KEY, fetched.handle);
      writeUserCache(fetched);
      setHandle(fetched.handle);
      setUser(fetched);
      setStatus("linked");
      return true;
    } catch (e) {
      setStatus("error");
      if (e instanceof CfApiError && e.kind === "NOT_FOUND") {
        setError(`No Codeforces user "${trimmed}" found.`);
      } else if (e instanceof CfApiError && e.kind === "RATE_LIMITED") {
        setError("Codeforces is rate-limiting requests — wait a few seconds and retry.");
      } else {
        setError("Could not reach Codeforces. Check your connection and retry.");
      }
      return false;
    }
  }, []);

  const unlinkHandle = useCallback(() => {
    localStorage.removeItem(HANDLE_KEY);
    localStorage.removeItem(USER_CACHE_KEY);
    localStorage.removeItem(SESSION_ID_KEY);
    setHandle(null);
    setUser(null);
    setStatus("idle");
    setError(null);
  }, []);

  return { handle, user, status, error, linkHandle, unlinkHandle };
}
