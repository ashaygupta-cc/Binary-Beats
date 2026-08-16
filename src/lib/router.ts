/**
 * router.ts — minimal hash router.
 *
 * Hash routing (not history/pushState) is deliberate: the frontend deploys
 * to Vercel as a static Vite build and the API lives on a different origin,
 * so there is no server to rewrite deep paths. Hash routes deep-link and
 * refresh correctly with zero config and zero new dependencies.
 *
 * Routes look like:  #/leaderboards  ·  #/u/123456789  ·  #/problems?platform=codeforces
 */
import { useEffect, useState } from "react";

export interface Route {
  /** Path segments, e.g. ["u", "123"] for #/u/123 */
  segments: string[];
  /** First segment, or "home" for #/ */
  page: string;
  /** Query params after ? in the hash */
  query: URLSearchParams;
  /** Raw hash path without the leading # */
  path: string;
}

function parseHash(hash: string): Route {
  const raw = hash.replace(/^#\/?/, "");
  const [pathPart, queryPart = ""] = raw.split("?");
  const segments = pathPart.split("/").filter(Boolean);
  return {
    segments,
    page: segments[0] ?? "home",
    query: new URLSearchParams(queryPart),
    path: pathPart,
  };
}

export function navigate(to: string): void {
  const next = to.startsWith("#") ? to : `#/${to.replace(/^\/+/, "")}`;
  if (window.location.hash === next) return;
  window.location.hash = next;
}

/** Subscribes to hashchange. Returns the current parsed route. */
export function useRoute(): Route {
  const [route, setRoute] = useState<Route>(() => parseHash(window.location.hash));

  useEffect(() => {
    const onChange = () => {
      setRoute(parseHash(window.location.hash));
      // Route changes should start at the top — otherwise deep pages open
      // mid-scroll on mobile after coming from a long list.
      window.scrollTo({ top: 0, behavior: "instant" as ScrollBehavior });
    };
    window.addEventListener("hashchange", onChange);
    return () => window.removeEventListener("hashchange", onChange);
  }, []);

  return route;
}

/** Normalises an empty hash to #/ once on boot so links are consistent. */
export function ensureHash(): void {
  if (!window.location.hash) window.location.replace("#/");
}
