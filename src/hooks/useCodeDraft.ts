import { useState, useEffect } from "react";
import { DEFAULT_CPP_CODE } from "../lib/wandbox";
import { getLeetCodeStarterCode } from "../lib/leetcodeSignatures";

interface CodeDraft {
  code: string;
  stdin: string;
}

const DRAFTS_KEY = "bb_blitz_code_v1";

function readAllDrafts(): Record<string, CodeDraft> {
  try {
    const raw = localStorage.getItem(DRAFTS_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function persistDraft(problemKey: string, draft: CodeDraft) {
  try {
    const all = readAllDrafts();
    all[problemKey] = draft;
    localStorage.setItem(DRAFTS_KEY, JSON.stringify(all));
  } catch {
    // ignore quota errors — draft simply won't survive a refresh
  }
}

/** Persists a per-problem C++ code/stdin draft in localStorage, keyed by problemKey. */
export function useCodeDraft(problemKey: string, platform?: string, title?: string, starterCode?: string) {
  const platStr = (platform || "").toLowerCase();
  const isLc =
    platStr.includes("leetcode") ||
    platStr.includes("lc") ||
    problemKey.toLowerCase().startsWith("lc-") ||
    (!problemKey.match(/^\d+[a-zA-Z]/) && problemKey.includes("-"));
  const defaultCode = starterCode && starterCode.trim() ? starterCode : isLc ? getLeetCodeStarterCode(problemKey, title) : DEFAULT_CPP_CODE;

  const [draft, setDraft] = useState<CodeDraft>(() => {
    const existing = readAllDrafts()[problemKey];
    return existing ?? { code: defaultCode, stdin: "" };
  });

  useEffect(() => {
    if (starterCode && starterCode.trim()) {
      setDraft((prev) => {
        const isGenericFallback =
          !prev.code ||
          prev.code.includes("// Write your solution for") ||
          prev.code.includes("int main()") ||
          prev.code.includes("() {");
        if (isGenericFallback && prev.code !== starterCode) {
          const next = { ...prev, code: starterCode };
          persistDraft(problemKey, next);
          return next;
        }
        return prev;
      });
    }
  }, [problemKey, starterCode]);

  const setCode = (code: string) => {
    setDraft((prev) => {
      const next = { ...prev, code };
      persistDraft(problemKey, next);
      return next;
    });
  };

  const setStdin = (stdin: string) => {
    setDraft((prev) => {
      const next = { ...prev, stdin };
      persistDraft(problemKey, next);
      return next;
    });
  };

  return { draft, setCode, setStdin };
}
