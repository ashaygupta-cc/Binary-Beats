/**
 * router.ts — HTML5 History Router (Clean paths without #).
 *
 * Routes look like:
 *   /content  ·  /leaderboards  ·  /u/123456789  ·  /c/daily_editorials/123
 *
 * For backwards compatibility with old hash links (e.g. #/content),
 * it seamlessly converts #/path -> /path on boot or navigation.
 */
import { useEffect, useState } from "react";

export interface Route {
  /** Path segments, e.g. ["u", "123"] for /u/123 */
  segments: string[];
  /** First segment, or "home" for / */
  page: string;
  /** Query params from URL search string */
  query: URLSearchParams;
  /** Raw path string without leading slash */
  path: string;
}

function parseLocation(): Route {
  // Backwards compatibility: if URL contains hash like #/content, convert to clean path
  if (typeof window !== "undefined" && window.location.hash && window.location.hash.startsWith("#/")) {
    const cleanPath = window.location.hash.replace(/^#\/?/, "/") || "/";
    window.history.replaceState({}, "", cleanPath);
  }

  const rawPath = window.location.pathname.replace(/^\/+/, "");
  const [pathPart = ""] = rawPath.split("?");
  const segments = pathPart.split("/").filter(Boolean);
  const query = new URLSearchParams(window.location.search);

  return {
    segments,
    page: segments[0] || "home",
    query,
    path: pathPart,
  };
}

export function navigate(to: string): void {
  let target = to.startsWith("#") ? to.replace(/^#\/?/, "/") : to;
  if (!target.startsWith("/")) target = `/${target.replace(/^\/+/, "")}`;

  const current = window.location.pathname + window.location.search;
  if (current === target) return;

  window.history.pushState({}, "", target);
  window.dispatchEvent(new Event("popstate"));
}

/** Subscribes to popstate navigation. Returns current parsed route. */
export function useRoute(): Route {
  const [route, setRoute] = useState<Route>(() => parseLocation());

  useEffect(() => {
    const onChange = () => {
      setRoute(parseLocation());
      window.scrollTo({ top: 0, behavior: "instant" as ScrollBehavior });
    };

    window.addEventListener("popstate", onChange);
    window.addEventListener("hashchange", onChange);
    return () => {
      window.removeEventListener("popstate", onChange);
      window.removeEventListener("hashchange", onChange);
    };
  }, []);

  return route;
}

/** Normalises any old hash URLs (like #/content) to clean /content routes on boot. */
export function ensureHash(): void {
  parseLocation();
}
