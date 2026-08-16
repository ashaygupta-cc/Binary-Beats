import { useCallback, useEffect, useState } from "react";
import { API_ORIGIN } from "../lib/apiBase";

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  avatarUrl: string | null;
}

type AuthStatus = "checking" | "authenticated" | "unauthenticated";

export interface UseAuthResult {
  user: AuthUser | null;
  status: AuthStatus;
  logout: () => Promise<void>;
}

export function useAuth(): UseAuthResult {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [status, setStatus] = useState<AuthStatus>("checking");

  useEffect(() => {
    let cancelled = false;

    fetch(`${API_ORIGIN}/api/auth/me`, { credentials: "include" })
      .then((res) => (res.ok ? res.json() : Promise.reject()))
      .then((data: { user: AuthUser }) => {
        if (cancelled) return;
        setUser(data.user);
        setStatus("authenticated");
      })
      .catch(() => {
        if (cancelled) return;
        setStatus("unauthenticated");
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const logout = useCallback(async () => {
    await fetch(`${API_ORIGIN}/api/auth/logout`, { method: "POST", credentials: "include" }).catch(() => {});
    window.location.href = "/login.html";
  }, []);

  return { user, status, logout };
}
