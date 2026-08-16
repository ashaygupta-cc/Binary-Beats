import { useState, useEffect, useCallback } from "react";
import { API_ORIGIN } from "../lib/apiBase";

export interface Problem {
  key: string;
  contestId: number;
  index: string;
  title: string | null;
  rating: number | null;
  tags: string[];
  timeLimitMs: number | null;
  memoryLimitMb: number | null;
  description: string | null;
  inputFormat: string | null;
  outputFormat: string | null;
  note: string | null;
  examples: { input: string; output: string }[];
  interactive: boolean;
  judgeable: boolean;
}

export interface UseProblemsOptions {
  search?: string;
  tags?: string[];
  difficulty?: "easy" | "medium" | "hard" | "";
  platform?: string;
  page?: number;
  pageSize?: number;
}

export interface UseProblemsResult {
  problems: Problem[];
  total: number;
  page: number;
  pages: number;
  loading: boolean;
  error: string | null;
  refresh: () => void;
}

export function useProblems(opts: UseProblemsOptions = {}): UseProblemsResult {
  const [problems, setProblems] = useState<Problem[]>([]);
  const [total, setTotal] = useState(0);
  const [pages, setPages] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rev, setRev] = useState(0);

  const page = opts.page ?? 1;
  const pageSize = opts.pageSize ?? 50;

  const refresh = useCallback(() => setRev((r) => r + 1), []);

  useEffect(() => {
    let cancelled = false;
    const params = new URLSearchParams();
    if (opts.search) params.set("search", opts.search);
    if (opts.tags && opts.tags.length > 0) params.set("tags", opts.tags.join(","));
    if (opts.difficulty) params.set("difficulty", opts.difficulty);
    if (opts.platform) params.set("platform", opts.platform);
    params.set("page", String(page));
    params.set("pageSize", String(pageSize));

    setLoading(true);
    setError(null);

    fetch(`${API_ORIGIN}/api/problems?${params}`)
      .then((r) => {
        if (!r.ok) throw new Error(`Server returned ${r.status}`);
        return r.json() as Promise<{ problems: Problem[]; total: number; page: number; pages: number }>;
      })
      .then((data) => {
        if (!cancelled) {
          setProblems(data.problems);
          setTotal(data.total);
          setPages(data.pages);
        }
      })
      .catch((e: Error) => {
        if (!cancelled) setError(e.message);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [opts.search, opts.difficulty, opts.platform, JSON.stringify(opts.tags), page, pageSize, rev]);

  return { problems, total, page, pages, loading, error, refresh };
}
