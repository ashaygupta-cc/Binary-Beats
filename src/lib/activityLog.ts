// A small local, real activity log shared by LeetCodeDashboard (local practice
// problems) and BlitzDuelView (real Codeforces solves), so the dashboard hero's
// "Recent"/"Streak" reflect actual solve events instead of fabricated ones.

export type ActivitySource = "leetcode" | "codeforces";

export interface ActivityEntry {
  source: ActivitySource;
  key?: string;
  title: string;
  meta: string;
  solvedAtSeconds: number;
}

const LOG_KEY = "bb_activity_log_v1";
const MAX_ENTRIES = 50;

function readLog(): ActivityEntry[] {
  try {
    const raw = localStorage.getItem(LOG_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function writeLog(entries: ActivityEntry[]) {
  try {
    localStorage.setItem(LOG_KEY, JSON.stringify(entries));
  } catch {
    // ignore quota errors
  }
}

export function logSolve(entry: ActivityEntry): void {
  const log = readLog();
  log.unshift(entry);
  writeLog(log.slice(0, MAX_ENTRIES));
}

export function getRecent(n: number): ActivityEntry[] {
  return readLog().slice(0, n);
}

export function countBySource(source: ActivitySource): number {
  return readLog().filter((e) => e.source === source).length;
}

function dayKey(seconds: number): string {
  const d = new Date(seconds * 1000);
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}

/** Consecutive calendar days with >=1 solve, counting back from today (or
 *  yesterday, if nothing's been solved yet today — so the streak doesn't
 *  zero out at midnight before you've had a chance to solve anything). */
export function computeStreak(): number {
  const days = new Set(readLog().map((e) => dayKey(e.solvedAtSeconds)));
  if (days.size === 0) return 0;

  const now = new Date();
  const cursor = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  if (!days.has(dayKey(Math.floor(cursor.getTime() / 1000)))) {
    cursor.setDate(cursor.getDate() - 1);
  }

  let streak = 0;
  while (days.has(dayKey(Math.floor(cursor.getTime() / 1000)))) {
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}

/** Real last-7-calendar-days activity (oldest first) for the hero's weekly strip. */
export function getWeekActivity(): { label: string; solved: boolean }[] {
  const days = new Set(readLog().map((e) => dayKey(e.solvedAtSeconds)));
  const now = new Date();
  const labels = ["S", "M", "T", "W", "T", "F", "S"];
  const result: { label: string; solved: boolean }[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i);
    result.push({ label: labels[d.getDay()], solved: days.has(dayKey(Math.floor(d.getTime() / 1000))) });
  }
  return result;
}
