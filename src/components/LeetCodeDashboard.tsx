import { useState, useEffect, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useProblems } from '../hooks/useProblems';
import { RatingBadge } from './ui/RatingBadge';
import { Panel } from './ui/Panel';
import { Tag } from './ui/Tag';
import { Button } from './ui/Button';
import { Eyebrow } from './ui/Eyebrow';
import { StatNumeral } from './ui/StatNumeral';
import { HeroSection } from './HeroSection';
import { ProblemOrbit } from './ProblemOrbit';
import { SolveWorkspace } from './solve/SolveWorkspace';
import { practiceProblemToSolvable } from './solve/adapters';
import { logSolve } from '../lib/activityLog';

interface Props {
  playSound: (t: 'click' | 'hover') => void;
  onShareSolution: (d: { problemTitle: string; code: string }) => void;
  onNavigateTab: (tab: string) => void;
}

const heatmapData = Array.from({ length: 22 * 7 }, (_, i) => {
  const r = Math.sin(i * 0.3) * 0.5 + Math.random();
  const val = i > 100 ? (r > 0.7 ? (r > 0.88 ? 3 : 2) : 0) : (r > 0.75 ? 1 : 0);
  const d = new Date(); d.setDate(d.getDate() - (22 * 7 - i));
  return { val, date: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) };
});

const SCOREBOARD_HEAT = ['rgba(242,242,237,0.06)', 'rgba(255,212,0,0.35)', 'rgba(255,212,0,0.65)', '#FFD400'];
const CF_TAGS = ['dp','greedy','graphs','trees','math','sorting','binary search','implementation','strings','geometry'];

const SORT_OPTIONS = [
  { id: 'default', label: 'Default' },
  { id: 'rating-asc', label: 'Rating ↑' },
  { id: 'rating-desc', label: 'Rating ↓' },
  { id: 'title', label: 'Title A–Z' },
] as const;

export const LeetCodeDashboard = ({ playSound, onShareSolution, onNavigateTab }: Props) => {
  const [search, setSearch] = useState('');
  const [difficulty, setDifficulty] = useState<''|'easy'|'medium'|'hard'>('');
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [activeKey, setActiveKey] = useState<string | null>(null);
  const [solvedKeys, setSolvedKeys] = useState<string[]>([]);
  const [solveTick, setSolveTick] = useState(0);
  const [viewMode, setViewMode] = useState<'list' | 'orbit'>('list');
  const [statusFilter, setStatusFilter] = useState<'all' | 'solved' | 'unsolved'>('all');
  const [sortBy, setSortBy] = useState<typeof SORT_OPTIONS[number]['id']>('default');
  const searchInputRef = useRef<HTMLInputElement>(null);

  // LeetCode Verification State
  const [verifyStatus, setVerifyStatus] = useState<{ verified: boolean; username: string | null; code: string | null }>({
    verified: false,
    username: null,
    code: null,
  });
  const [lcUsernameInput, setLcUsernameInput] = useState('');
  const [loadingVerify, setLoadingVerify] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Fetch status on mount
  useEffect(() => {
    fetch("/api/leetcode/status")
      .then((res) => res.json())
      .then((data) => {
        if (data && typeof data.verified === "boolean") {
          setVerifyStatus({
            verified: data.verified,
            username: data.username,
            code: data.code,
          });
          if (data.username) {
            setLcUsernameInput(data.username);
          }
        }
      })
      .catch((err) => console.error("Error fetching LeetCode status:", err));
  }, []);

  const handleStartVerify = async () => {
    playSound("click");
    setLoadingVerify(true);
    setErrorMsg(null);
    try {
      const res = await fetch("/api/leetcode/start-verification", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: lcUsernameInput }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || "Failed to start verification");
      }
      setVerifyStatus({
        verified: false,
        username: lcUsernameInput,
        code: data.code,
      });
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setLoadingVerify(false);
    }
  };

  const handleConfirmVerify = async () => {
    playSound("click");
    setLoadingVerify(true);
    setErrorMsg(null);
    try {
      const res = await fetch("/api/leetcode/confirm-verification", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || "Verification check failed");
      }
      setVerifyStatus({
        verified: true,
        username: data.username,
        code: null,
      });
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setLoadingVerify(false);
    }
  };

  const handleCancelVerify = () => {
    playSound("click");
    setVerifyStatus({ verified: false, username: null, code: null });
    setLcUsernameInput("");
    setErrorMsg(null);
  };

  const { problems, total, pages, loading, error } = useProblems({
    search: search || undefined,
    difficulty: difficulty || undefined,
    tags: selectedTag ? [selectedTag] : undefined,
    page, pageSize: 50,
  });

  const activeProblem = activeKey ? problems.find(p => p.key === activeKey) ?? null : null;

  useEffect(() => { setPage(1); }, [search, difficulty, selectedTag]);

  // Load solved problem keys from the activity log
  useEffect(() => {
    try {
      const raw = localStorage.getItem("bb_activity_log_v1");
      if (raw) {
        const parsed = JSON.parse(raw);
        const keys = parsed.map((e: any) => e.key).filter(Boolean);
        setSolvedKeys(keys);
      }
    } catch {}
  }, [solveTick]);

  // "/" focuses search, like most fast problem trackers
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const tag = (document.activeElement as HTMLElement)?.tagName;
      if (e.key === '/' && tag !== 'INPUT' && tag !== 'TEXTAREA') {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  const open = (key: string) => { playSound('click'); setActiveKey(key); };
  const back = () => { playSound('click'); setActiveKey(null); };

  const getDiff = (rating?: number | null) => !rating ? 'Unrated' : rating<=1300 ? 'Easy' : rating<=1900 ? 'Medium' : 'Hard';

  // Client-side status filter + sort layered on top of the server-paginated page
  const displayProblems = useMemo(() => {
    let list = problems.filter(p => {
      if (statusFilter === 'solved') return solvedKeys.includes(p.key);
      if (statusFilter === 'unsolved') return !solvedKeys.includes(p.key);
      return true;
    });
    if (sortBy === 'rating-asc') list = [...list].sort((a, b) => (a.rating ?? 99999) - (b.rating ?? 99999));
    if (sortBy === 'rating-desc') list = [...list].sort((a, b) => (b.rating ?? -1) - (a.rating ?? -1));
    if (sortBy === 'title') list = [...list].sort((a, b) => (a.title ?? a.key).localeCompare(b.title ?? b.key));
    return list;
  }, [problems, statusFilter, sortBy, solvedKeys]);

  const diffBreakdown = useMemo(() => {
    const counts: Record<string, number> = { Easy: 0, Medium: 0, Hard: 0, Unrated: 0 };
    displayProblems.forEach(p => { counts[getDiff(p.rating)]++; });
    return counts;
  }, [displayProblems]);

  const currentStreak = useMemo(() => {
    let s = 0;
    for (let i = heatmapData.length - 1; i >= 0; i--) {
      if (heatmapData[i].val > 0) s++; else break;
    }
    return s;
  }, []);

  const nextUp = problems.find(p => !solvedKeys.includes(p.key)) ?? problems[0] ?? null;

  const activeFilterCount = [search, difficulty, selectedTag, statusFilter !== 'all' ? statusFilter : ''].filter(Boolean).length;
  const resetFilters = () => {
    playSound('click');
    setSearch(''); setDifficulty(''); setSelectedTag(null); setStatusFilter('all');
  };

  return (
    <div className="w-full min-h-[calc(100vh-64px)] text-bb-ink flex flex-col">
      <AnimatePresence mode="wait">

        {/* ── WORKSPACE VIEW — full-bleed, no page max-width, desktop IDE layout ── */}
        {activeKey && activeProblem ? (
          <motion.div
            key="workspace"
            initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}}
            className="flex-1 flex flex-col w-full px-2.5 lg:px-4 py-2.5 lg:py-3 min-h-0"
          >
            <SolveWorkspace
              mode="practice"
              problem={practiceProblemToSolvable(activeProblem)}
              solved={solvedKeys.includes(activeKey)}
              onBack={back}
              onAccepted={() => {
                playSound('click');
                setSolveTick(t => t + 1);
                logSolve({
                  source: 'leetcode',
                  key: activeKey,
                  title: activeProblem.title ?? activeKey,
                  meta: activeProblem.rating ? String(activeProblem.rating) : 'Unrated',
                  solvedAtSeconds: Math.floor(Date.now() / 1000),
                });
              }}
              playSound={playSound}
            />
          </motion.div>

        ) : (
          /* ── HOME DASHBOARD (NO RAW PROBLEM TABLE ON HOME) ── */
          <div className="w-full max-w-[1400px] mx-auto px-6 lg:px-8 py-10 flex-1 flex flex-col">
            <motion.div key="dashboard" initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} className="flex flex-col gap-0">
              <HeroSection total={total} playSound={playSound} onNavigateTab={onNavigateTab} />

              {/* Featured Platform Entry Points */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 my-6">
                <Panel lift className="p-6 flex flex-col gap-4 border-bb-yellow/30 bg-bb-surface-2/40">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-[10px] uppercase font-bold text-bb-yellow">1v1 Arena</span>
                  </div>
                  <div>
                    <h3 className="font-display font-bold text-xl text-bb-ink">Blitz &amp; Duels</h3>
                    <p className="font-mono text-xs text-bb-ink-soft mt-1">Real-time rating-matched battle arena. Solve fast to gain Elo points.</p>
                  </div>
                  <Button variant="primary" size="md" onClick={() => { playSound('click'); onNavigateTab('blitz'); }} className="mt-2">
                    Enter Arena
                  </Button>
                </Panel>

                <Panel lift className="p-6 flex flex-col gap-4 border-cyan-500/30 bg-bb-surface-2/40">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-[10px] uppercase font-bold text-cyan-400">CP / DSA Library</span>
                  </div>
                  <div>
                    <h3 className="font-display font-bold text-xl text-bb-ink">CP &amp; DSA Content Hub</h3>
                    <p className="font-mono text-xs text-bb-ink-soft mt-1">Browse 9,980+ Codeforces &amp; 2,650+ LeetCode problems with filters &amp; local C++ judge.</p>
                  </div>
                  <Button variant="outline" size="md" onClick={() => { playSound('click'); onNavigateTab('content'); }} className="mt-2">
                    Explore 12,500+ Problems ↗
                  </Button>
                </Panel>

                <Panel lift className="p-6 flex flex-col gap-4 border-bb-line-strong bg-bb-surface-2/40">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-[10px] uppercase font-bold text-bb-ink-faint">Rankings</span>
                  </div>
                  <div>
                    <h3 className="font-display font-bold text-xl text-bb-ink">Leaderboards</h3>
                    <p className="font-mono text-xs text-bb-ink-soft mt-1">Check global Elo ratings, weekly solve leaderboards &amp; guild standings.</p>
                  </div>
                  <Button variant="outline" size="md" onClick={() => { playSound('click'); onNavigateTab('leaderboards'); }} className="mt-2">
                    View Rankings
                  </Button>
                </Panel>
              </div>
            </motion.div>
          </div>
        )}

      </AnimatePresence>
    </div>
  );
};
