import { useCallback, useState } from "react";
import type { Verdict } from "../lib/judgeApi";

export interface SubmissionRecord {
  id: string;
  submittedAtSeconds: number;
  status: Verdict["status"];
  passedCount: number;
  totalCount: number;
  timeMs: number;
  peakMemoryMb?: number;
  /** Code snapshot at submit time — independent of the live-editing draft. */
  code: string;
}

const HISTORY_KEY = "bb_submission_history_v1";
const MAX_PER_PROBLEM = 20;

function readAll(): Record<string, SubmissionRecord[]> {
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function writeAll(all: Record<string, SubmissionRecord[]>) {
  try {
    localStorage.setItem(HISTORY_KEY, JSON.stringify(all));
  } catch {
    // ignore quota errors — history simply won't survive a refresh
  }
}

/** Client-only per-problem submission history, mirroring useCodeDraft.ts's per-key
 *  localStorage sharding. There's no durable backend store for this today — runs
 *  live in an in-memory 10-min-TTL map and sessions are ephemeral. */
export function useSubmissionHistory(problemKey: string) {
  const [history, setHistory] = useState<SubmissionRecord[]>(() => readAll()[problemKey] ?? []);

  const addRecord = useCallback(
    (r: Omit<SubmissionRecord, "id">) => {
      const record: SubmissionRecord = { ...r, id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}` };
      setHistory((prev) => {
        const next = [record, ...prev].slice(0, MAX_PER_PROBLEM);
        const all = readAll();
        all[problemKey] = next;
        writeAll(all);
        return next;
      });
    },
    [problemKey]
  );

  return { history, addRecord };
}
