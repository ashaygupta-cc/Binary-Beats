import { useEffect, useState } from "react";
import { fetchStatement, ProblemsApiError, type ProblemStatementData } from "../lib/problemsApi";

interface ProblemStatementState {
  statement: ProblemStatementData | null;
  loading: boolean;
  /** The problem simply isn't in the local dataset — expected for the newest problems. */
  notCovered: boolean;
  error: string | null;
}

export function useProblemStatement(problemKey: string, platform?: string): ProblemStatementState {
  const [state, setState] = useState<ProblemStatementState>({
    statement: null,
    loading: true,
    notCovered: false,
    error: null,
  });

  useEffect(() => {
    let cancelled = false;
    setState({ statement: null, loading: true, notCovered: false, error: null });

    fetchStatement(problemKey, platform)
      .then((statement) => {
        if (!cancelled) setState({ statement, loading: false, notCovered: false, error: null });
      })
      .catch((e) => {
        if (cancelled) return;
        if (e instanceof ProblemsApiError && e.kind === "NOT_COVERED") {
          setState({ statement: null, loading: false, notCovered: true, error: null });
        } else {
          setState({ statement: null, loading: false, notCovered: false, error: (e as Error).message });
        }
      });

    return () => {
      cancelled = true;
    };
  }, [problemKey, platform]);

  return state;
}
