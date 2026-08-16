import { useCallback, useEffect, useState } from "react";
import { API_ORIGIN } from "../lib/apiBase";

export interface DiscordUser {
  id: string;
  username: string;
  globalName: string | null;
  avatarUrl: string | null;
  /** True only if the user is currently in the Binary Beats guild. */
  isMember: boolean;
  roles: string[];
}

type AuthStatus = "checking" | "authenticated" | "unauthenticated";

export interface UseDiscordAuthResult {
  user: DiscordUser | null;
  status: AuthStatus;
  /** "anon" | "outsider" | null — feed straight into <MemberGate reason>. */
  gateReason: "anon" | "outsider" | null;
  login: () => void;
  logout: () => Promise<void>;
  refresh: () => void;
}

/** Replaces useAuth for the new Discord-first identity. Membership is read
 *  live from /api/discord/me, so joining the server unlocks features on the
 *  next refresh without a re-login. */
export function useDiscordAuth(): UseDiscordAuthResult {
  const [user, setUser] = useState<DiscordUser | null>(null);
  const [status, setStatus] = useState<AuthStatus>("checking");
  const [nonce, setNonce] = useState(0);

  useEffect(() => {
    let cancelled = false;

    fetch(`${API_ORIGIN}/api/discord/me`, { credentials: "include" })
      .then((res) => (res.ok ? res.json() : Promise.reject()))
      .then((data: { user: DiscordUser }) => {
        if (cancelled) return;
        setUser(data.user);
        setStatus("authenticated");
      })
      .catch(() => {
        if (cancelled) return;
        setUser(null);
        setStatus("unauthenticated");
      });

    return () => {
      cancelled = true;
    };
  }, [nonce]);

  const login = useCallback(() => {
    window.location.href = `${API_ORIGIN}/api/discord/login`;
  }, []);

  const logout = useCallback(async () => {
    await fetch(`${API_ORIGIN}/api/discord/logout`, {
      method: "POST",
      credentials: "include",
    }).catch(() => {});
    setUser(null);
    setStatus("unauthenticated");
  }, []);

  const gateReason: "anon" | "outsider" | null =
    status !== "authenticated" || !user ? "anon" : (user.isMember ?? true) ? null : "outsider";

  return {
    user,
    status,
    gateReason,
    login,
    logout,
    refresh: () => setNonce((n) => n + 1),
  };
}
