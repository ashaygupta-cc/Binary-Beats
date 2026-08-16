import React, { useMemo, useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { colorForRating, tierForRating } from './ui/RatingBadge';
import { Panel } from './ui/Panel';
import { Eyebrow } from './ui/Eyebrow';
import { StatNumeral } from './ui/StatNumeral';
import { Divider } from './ui/Divider';

interface LeaderboardProps {
  playSound: (type: 'click' | 'hover') => void;
  currentUser: string;
}

interface UserRank {
  username: string;
  avatar: string;
  rating: number;
  solved: number;
  streak: number;
}

export const LeaderboardView: React.FC<LeaderboardProps> = ({ playSound, currentUser }) => {
  const [search, setSearch] = useState('');
  const [users, setUsers] = useState<UserRank[]>([]);
  const [boardType, setBoardType] = useState<'daily' | 'weekly'>('daily');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/leaderboard/${boardType}`)
      .then((res) => res.json())
      .then((data) => {
        if (data && Array.isArray(data.leaderboard)) {
          const mapped = data.leaderboard.map((item: any) => ({
            username: item.displayName || item.username,
            avatar: (item.displayName || item.username || "??").substring(0, 2).toUpperCase(),
            rating: item.rating,
            solved: item.solvedCount,
            streak: Math.abs(item.rating % 5) + 1,
          }));
          setUsers(mapped);
        }
      })
      .catch((err) => console.error("Error loading leaderboard:", err))
      .finally(() => setLoading(false));
  }, [boardType]);

  const ranked = useMemo(() => {
    return [...users]
      .sort((a, b) => b.rating - a.rating)
      .map((u, i) => ({ ...u, rank: i + 1 }));
  }, [users]);

  const podium = [ranked[1], ranked[0], ranked[2]].filter(Boolean);
  const rest = ranked.filter((u) => u.rank > 3);

  const visibleUsers = useMemo(() => {
    return rest.filter((u) => u.username.toLowerCase().includes(search.toLowerCase()));
  }, [rest, search]);

  const myRank = ranked.find((u) => u.username === currentUser)?.rank;

  const TIER_GUIDE = [
    { tier: 'Grandmaster', range: '2400+', sample: 2400 },
    { tier: 'Master', range: '2100–2399', sample: 2100 },
    { tier: 'Candidate Master', range: '1900–2099', sample: 1900 },
    { tier: 'Expert', range: '1600–1899', sample: 1600 },
    { tier: 'Specialist', range: '1400–1599', sample: 1400 },
    { tier: 'Pupil', range: '1200–1399', sample: 1200 },
    { tier: 'Newbie', range: '< 1200', sample: 0 },
  ];

  return (
    <div className="w-full min-h-[calc(100vh-56px)] text-bb-ink relative pb-12">
      <div className="w-full max-w-7xl mx-auto px-6 lg:px-10 py-8 flex flex-col gap-8 relative z-10">

        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="relative">
            <span
              aria-hidden
              className="pointer-events-none select-none absolute -top-9 -left-1 -z-10 text-[120px] font-display font-black text-bb-ink/[0.045] leading-none"
            >
              03
            </span>
            <Eyebrow number="03" className="mb-2">Global Standings</Eyebrow>
            <h2 className="text-2xl md:text-3xl font-display font-extrabold tracking-tight text-bb-ink mb-1 mt-2">Leaderboard</h2>
            <p className="text-xs font-mono text-bb-ink-faint">Ranked by rating</p>
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex rounded border border-bb-line bg-bb-surface p-0.5 font-mono text-[11px] gap-0.5 mr-2">
              {([
                { id: "daily" as const, label: "Daily (Rating)" },
                { id: "weekly" as const, label: "Weekly (Solves)" },
              ]).map((t) => (
                <button
                  key={t.id}
                  onClick={() => {
                    playSound("click");
                    setBoardType(t.id);
                  }}
                  className={`px-3 h-7 rounded-sm font-bold cursor-pointer transition-colors ${
                    boardType === t.id ? "bg-bb-ink text-bb-ground" : "text-bb-ink-faint hover:text-bb-ink-soft"
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>

            <div className="relative flex-1 md:w-56 md:flex-none">
              <svg className="absolute left-3.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-bb-ink-faint" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search users..."
                className="w-full h-10 pl-10 pr-4 rounded text-xs font-mono text-bb-ink bg-bb-surface placeholder-bb-ink-faint focus:outline-none border border-bb-line focus:border-bb-line-strong transition-colors"
              />
            </div>
          </div>
        </div>

        {/* Podium — top 3 */}
        <div className="grid grid-cols-3 gap-3 md:gap-6 items-end">
          {podium.map((u) => {
            const isFirst = u.rank === 1;
            const isMe = u.username === currentUser;
            const color = colorForRating(u.rating);
            return (
              <motion.div
                key={u.username}
                layout
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: isFirst ? 0 : 0.1, type: 'spring', stiffness: 200, damping: 20 }}
                className={`relative flex flex-col items-center rounded border p-5 transition-colors ${
                  isFirst
                    ? 'border-bb-yellow/40 bg-bb-yellow-fill pb-8 order-2 bracket-frame text-bb-yellow -translate-y-4 md:-translate-y-7 z-10'
                    : `border-bb-line bg-bb-surface hover:border-bb-line-strong pb-6 ${u.rank === 2 ? 'order-1' : 'order-3'}`
                }`}
              >
                <span className={`absolute -top-3 rounded-sm border font-mono font-black text-xs w-7 h-7 flex items-center justify-center ${
                  isFirst ? 'bg-bb-yellow text-bb-ground border-bb-yellow' : 'bg-bb-ink/[0.06] text-bb-ink-soft border-bb-line-strong'
                }`}>#{u.rank}</span>
                <div
                  className={`rounded-full flex items-center justify-center font-bold font-mono bg-bb-ink text-bb-ground mt-3 mb-3 ${
                    isFirst ? 'w-16 h-16 text-lg border-2 border-bb-yellow/50' : 'w-12 h-12 text-sm'
                  }`}
                >
                  {u.avatar}
                </div>
                <span className={`font-semibold truncate max-w-full ${isFirst ? 'text-bb-ink text-sm' : 'text-bb-ink-soft text-xs'}`}>
                  {u.username}{isMe && <span className="text-bb-yellow"> (you)</span>}
                </span>
                <span className="mt-0.5 text-[9px] font-mono font-bold uppercase tracking-wider" style={{ color }}>
                  {tierForRating(u.rating)}
                </span>
                <StatNumeral value={u.rating} size={isFirst ? 'lg' : 'md'} className={`mt-2 ${isFirst ? 'text-bb-yellow' : 'text-bb-ink'}`} />
              </motion.div>
            );
          })}
        </div>

        {/* Main layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
          {/* Table */}
          <Panel className="lg:col-span-2 overflow-hidden flex flex-col">
            <div className="grid grid-cols-[60px_1fr_90px_80px_70px] items-center h-10 px-6 border-b border-bb-line select-none">
              <Eyebrow tone="muted">Rank</Eyebrow>
              <Eyebrow tone="muted">Developer</Eyebrow>
              <Eyebrow tone="muted" className="justify-end text-right">Rating</Eyebrow>
              <Eyebrow tone="muted" className="justify-end text-right">Solved</Eyebrow>
              <Eyebrow tone="muted" className="justify-end text-right">Streak</Eyebrow>
            </div>

            <div className="flex flex-col divide-y divide-bb-line">
              <AnimatePresence mode="popLayout">
                {visibleUsers.length === 0 ? (
                  <motion.div key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                    className="py-16 text-center text-xs font-mono text-bb-ink-faint">
                    No developers found
                  </motion.div>
                ) : (
                  visibleUsers.map((u) => {
                    const isMe = u.username === currentUser;
                    return (
                      <motion.div
                        key={u.username} layout
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        className={`grid grid-cols-[60px_1fr_90px_80px_70px] items-center px-6 py-4 transition-colors border-l-2 ${
                          isMe ? 'bg-bb-yellow-fill border-l-bb-yellow' : 'border-l-transparent hover:bg-bb-ink/[0.02] hover:border-l-bb-yellow/40'
                        }`}
                      >
                        <div className="flex items-center">
                          <StatNumeral value={u.rank} size="sm" className="text-bb-ink-faint" />
                        </div>

                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-bold bg-bb-ink text-bb-ground font-mono">
                            {u.avatar}
                          </div>
                          <div className="flex flex-col">
                            <span className={`text-sm font-semibold font-sans ${isMe ? 'text-bb-ink' : 'text-bb-ink-soft'}`}>
                              {u.username} {isMe && <span className="text-[10px] font-mono tracking-wider uppercase text-bb-yellow ml-2 font-bold">(you)</span>}
                            </span>
                            <span className="text-[10px] font-mono font-bold" style={{ color: colorForRating(u.rating) }}>
                              {tierForRating(u.rating)}
                            </span>
                          </div>
                        </div>

                        <div className="text-right">
                          <StatNumeral value={u.rating} size="sm" className="text-bb-ink" />
                        </div>
                        <div className="text-right text-xs font-mono text-bb-ink-soft">{u.solved}</div>
                        <div className="text-right text-xs font-mono text-bb-ink-soft">🔥{u.streak}d</div>
                      </motion.div>
                    );
                  })
                )}
              </AnimatePresence>
            </div>
          </Panel>

          {/* Sidebar */}
          <div className="flex flex-col gap-6">
            <motion.div initial={{ opacity: 0, x: 15 }} animate={{ opacity: 1, x: 0 }}>
              <Panel className="p-5">
                <div className="mb-4">
                  <Eyebrow tone="muted">Your Status</Eyebrow>
                  <Divider className="mt-2" />
                </div>
                <div className="flex flex-col gap-4">
                  <div>
                    <Eyebrow tone="muted" className="mb-1">Global Standing</Eyebrow>
                    <div className="flex items-baseline gap-2 text-bb-yellow">
                      {myRank
                        ? <><span className="stat-num text-4xl">#</span><StatNumeral value={myRank} size="lg" /></>
                        : <span className="stat-num text-4xl">—</span>}
                    </div>
                  </div>
                  <div>
                    <Eyebrow tone="muted" className="mb-1">Rating Trend</Eyebrow>
                    <div className="h-10 mt-1 relative flex items-end">
                      <svg className="w-full h-full text-bb-yellow" viewBox="0 0 100 30" fill="none">
                        <path d="M0,25 Q15,22 30,23 T60,12 T90,8" stroke="currentColor" strokeWidth="2" fill="none" />
                        <circle cx="90" cy="8" r="2.5" fill="var(--bb-yellow)" className="animate-pulse" />
                      </svg>
                    </div>
                  </div>
                </div>
              </Panel>
            </motion.div>

            <motion.div initial={{ opacity: 0, x: 15 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.1 }}>
              <Panel className="p-5">
                <div className="mb-3">
                  <Eyebrow tone="muted">Tier Guide</Eyebrow>
                  <Divider className="mt-2" />
                </div>
                <div className="flex flex-col gap-3 text-xs font-mono">
                  {TIER_GUIDE.map(t => (
                    <div key={t.tier} className="flex justify-between items-center">
                      <div className="flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: colorForRating(t.sample) }} />
                        <span className="text-bb-ink-soft font-bold">{t.tier}</span>
                      </div>
                      <span className="text-bb-ink-faint text-[10px]">{t.range}</span>
                    </div>
                  ))}
                </div>
              </Panel>
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  );
};
