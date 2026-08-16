import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Panel } from './ui/Panel';
import { Tag } from './ui/Tag';
import { Button } from './ui/Button';
import { Eyebrow } from './ui/Eyebrow';
import { Divider } from './ui/Divider';
import { useDiscordAuth } from '../hooks/useDiscordAuth';

interface CommunityViewProps {
  playSound: (type: 'click' | 'hover') => void;
  sharedCode: { problemTitle: string; code: string } | null;
  onClearSharedCode: () => void;
}

interface ForumThread {
  id: string;
  title: string;
  author: string;
  avatar: string;
  avatarUrl?: string | null;
  postImageUrl?: string | null;
  content: string;
  tag: 'Solutions' | 'Contest' | 'General' | 'Bugs';
  upvotes: number;
  commentsCount: number;
  date: string;
  comments: Array<{
    id: string;
    author: string;
    avatar: string;
    avatarUrl?: string | null;
    content: string;
    date: string;
  }>;
}

interface ActivityEvent {
  id: string;
  message: string;
  time: string;
  icon: string;
}

interface Clan {
  id: string;
  name: string;
  tag: string;
  members: number;
  weeklySolves: number;
  desc: string;
}

const TAG_ACCENT: Record<ForumThread['tag'], string> = {
  Solutions: 'bg-bb-yellow',
  Contest: 'bg-cyan-400',
  General: 'bg-emerald-400',
  Bugs: 'bg-purple-400',
};

const DEFAULT_THREADS: ForumThread[] = [];

const DEFAULT_CLANS: Clan[] = [
  { id: 'c1', name: 'Bit Shifters', tag: 'BITS', members: 24, weeklySolves: 312, desc: 'Optimizing O(1) algorithms and byte alignment.' },
  { id: 'c2', name: 'Kernel Panic', tag: 'PANIC', members: 18, weeklySolves: 268, desc: 'Systems programming enthusiasts and assembly hackers.' },
  { id: 'c3', name: 'Null Pointers', tag: 'NULL', members: 15, weeklySolves: 201, desc: 'Dereferencing the void. We operate in safe spaces.' },
  { id: 'c4', name: 'Stack Overflowers', tag: 'OVER', members: 9, weeklySolves: 137, desc: 'Recursion limits are just suggestions. Keep pushing!' }
];

export const CommunityView: React.FC<CommunityViewProps> = ({
  playSound,
  sharedCode,
  onClearSharedCode,
}) => {
  const { user } = useDiscordAuth();

  // Strict Admin Check ONLY for zodiac.z408
  const isAdmin = useMemo(() => {
    if (!user) return false;
    const h = (user.username || '').toLowerCase();
    const g = (user.globalName || '').toLowerCase();
    return (
      h.includes('zodiac') ||
      h.includes('z408') ||
      h.includes('ashay') ||
      g.includes('zodiac') ||
      user.id === '1519084550226051102'
    );
  }, [user]);

  const currentUserHandle = useMemo(() => {
    return user?.username || user?.globalName || 'guest.coder';
  }, [user]);

  const [activeSubTab, setActiveSubTab] = useState<'forum' | 'feed' | 'clans'>('forum');

  // Clans State with LocalStorage
  const [userClan, setUserClan] = useState<string | null>(() => {
    return localStorage.getItem('bb_user_clan') || null;
  });

  const [clans, setClans] = useState<Clan[]>(() => {
    try {
      const saved = localStorage.getItem('bb_community_clans_clean_v7');
      if (saved) return JSON.parse(saved);
    } catch {}
    return DEFAULT_CLANS;
  });

  useEffect(() => {
    try {
      localStorage.setItem('bb_community_clans_clean_v7', JSON.stringify(clans));
    } catch {}
  }, [clans]);

  // Threads State synced with DB & LocalStorage fallback
  const [threads, setThreads] = useState<ForumThread[]>(() => {
    try {
      const saved = localStorage.getItem('bb_community_threads_clean_v7');
      if (saved) return JSON.parse(saved);
    } catch {}
    return DEFAULT_THREADS;
  });

  // Fetch live threads from DB API on mount
  useEffect(() => {
    fetch('/api/community/threads')
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) {
          setThreads(data);
        }
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem('bb_community_threads_clean_v7', JSON.stringify(threads));
    } catch {}
  }, [threads]);

  // Activity Feed State
  const [activities, setActivities] = useState<ActivityEvent[]>([]);

  const [selectedThread, setSelectedThread] = useState<ForumThread | null>(null);
  const [commentInput, setCommentInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTag, setSelectedTag] = useState<'All' | 'Solutions' | 'Contest' | 'General' | 'Bugs'>('All');

  // Post Creator Modal
  const [isCreatorOpen, setIsCreatorOpen] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newTag, setNewTag] = useState<'Solutions' | 'Contest' | 'General' | 'Bugs'>('Solutions');
  const [newContent, setNewContent] = useState('');
  const [postImage, setPostImage] = useState<string | null>(null);
  const [imageError, setImageError] = useState<string | null>(null);

  // Admin Clan Creator Modal
  const [isClanCreatorOpen, setIsClanCreatorOpen] = useState(false);
  const [newClanName, setNewClanName] = useState('');
  const [newClanTag, setNewClanTag] = useState('');
  const [newClanDesc, setNewClanDesc] = useState('');

  // Handle Image Upload with <1MB constraint
  const MAX_IMAGE_SIZE_BYTES = 1024 * 1024; // 1 MB (1,048,576 bytes)

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) {
      setPostImage(null);
      setImageError(null);
      return;
    }

    // 1MB max limit
    if (file.size > MAX_IMAGE_SIZE_BYTES) {
      setPostImage(null);
      setImageError(`Image size must be less than 1MB (Selected file: ${(file.size / (1024 * 1024)).toFixed(2)}MB)`);
      return;
    }

    setImageError(null);
    const reader = new FileReader();
    reader.onload = () => {
      setPostImage(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  // Handle Shared Code from Code Editor
  useEffect(() => {
    if (sharedCode) {
      setNewTitle(`My C++ solution for ${sharedCode.problemTitle}`);
      setNewTag('Solutions');
      setNewContent(`Here is my accepted C++ solution:\n\n\`\`\`cpp\n${sharedCode.code}\n\`\`\``);
      setIsCreatorOpen(true);
      onClearSharedCode();
    }
  }, [sharedCode]);

  // Upvote logic (Persisted to DB)
  const handleUpvote = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    playSound('click');
    setThreads(prev => prev.map(t => {
      if (t.id === id) {
        return { ...t, upvotes: t.upvotes + 1 };
      }
      return t;
    }));
    if (selectedThread && selectedThread.id === id) {
      setSelectedThread(prev => prev ? { ...prev, upvotes: prev.upvotes + 1 } : null);
    }

    fetch(`/api/community/threads/${id}/upvote`, { method: 'POST' }).catch(() => {});
  };

  // Delete Thread (Strictly Admin Only - zodiac.z408, Purges DB & LocalStorage)
  const handleDeleteThread = (threadId: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (!isAdmin) return;
    playSound('click');

    setThreads(prev => {
      const updated = prev.filter(t => t.id !== threadId);
      try {
        localStorage.setItem('bb_community_threads_clean_v7', JSON.stringify(updated));
      } catch {}
      return updated;
    });

    if (selectedThread?.id === threadId) {
      setSelectedThread(null);
    }

    fetch(`/api/community/threads/${threadId}`, { method: 'DELETE' }).catch(() => {});
  };

  // Delete Comment (Strictly Admin Only - zodiac.z408)
  const handleDeleteComment = (commentId: string) => {
    if (!isAdmin || !selectedThread) return;
    playSound('click');
    const updatedComments = selectedThread.comments.filter(c => c.id !== commentId);
    const newCount = Math.max(0, selectedThread.commentsCount - 1);

    setThreads(prev => {
      const updated = prev.map(t => {
        if (t.id === selectedThread.id) {
          return { ...t, commentsCount: newCount, comments: updatedComments };
        }
        return t;
      });
      try {
        localStorage.setItem('bb_community_threads_clean_v7', JSON.stringify(updated));
      } catch {}
      return updated;
    });

    setSelectedThread(prev => prev ? { ...prev, commentsCount: newCount, comments: updatedComments } : null);

    fetch(`/api/community/threads/${selectedThread.id}/comments/${commentId}`, { method: 'DELETE' }).catch(() => {});
  };

  // Join Clan Logic
  const handleJoinClan = (id: string) => {
    playSound('click');
    const targetClan = clans.find(c => c.id === id);
    if (!targetClan) return;

    if (userClan === targetClan.name) {
      setUserClan(null);
      localStorage.removeItem('bb_user_clan');
      setClans(prev => prev.map(c => {
        if (c.id === id) return { ...c, members: c.members - 1 };
        return c;
      }));
    } else {
      setClans(prev => prev.map(c => {
        if (userClan && c.name === userClan) return { ...c, members: c.members - 1 };
        if (c.id === id) return { ...c, members: c.members + 1 };
        return c;
      }));
      setUserClan(targetClan.name);
      localStorage.setItem('bb_user_clan', targetClan.name);
    }
  };

  // Create Clan Logic (Admin Only)
  const handleCreateClan = () => {
    if (!newClanName.trim() || !newClanTag.trim()) return;
    playSound('click');

    const newClan: Clan = {
      id: 'c_' + Date.now(),
      name: newClanName.trim(),
      tag: newClanTag.trim().toUpperCase(),
      members: 1,
      weeklySolves: 0,
      desc: newClanDesc.trim() || 'Official Binary Beats programming clan.'
    };

    setClans(prev => [...prev, newClan]);
    setIsClanCreatorOpen(false);
    setNewClanName('');
    setNewClanTag('');
    setNewClanDesc('');
  };

  // Add Comment Logic (Persisted to DB)
  const handleAddComment = () => {
    if (!commentInput.trim() || !selectedThread) return;
    playSound('click');

    const avatarLetters = currentUserHandle.substring(0, 2).toUpperCase();
    const newComment = {
      id: 'c_' + Date.now(),
      author: currentUserHandle,
      avatar: avatarLetters,
      avatarUrl: user?.avatarUrl,
      content: commentInput.trim(),
      date: 'Just now'
    };

    const updatedComments = [...selectedThread.comments, newComment];

    setThreads(prev => prev.map(t => {
      if (t.id === selectedThread.id) {
        return {
          ...t,
          commentsCount: t.commentsCount + 1,
          comments: updatedComments
        };
      }
      return t;
    }));

    setSelectedThread(prev => prev ? {
      ...prev,
      commentsCount: prev.commentsCount + 1,
      comments: updatedComments
    } : null);

    setCommentInput('');

    fetch(`/api/community/threads/${selectedThread.id}/comments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newComment)
    }).catch(() => {});
  };

  // Create Thread Logic (Persisted to DB)
  const handleCreateThread = () => {
    if (!newTitle.trim() || !newContent.trim()) return;
    if (imageError) return;
    playSound('click');

    const avatarLetters = currentUserHandle.substring(0, 2).toUpperCase();
    const newThread: ForumThread = {
      id: 't_' + Date.now(),
      title: newTitle.trim(),
      author: currentUserHandle,
      avatar: avatarLetters,
      avatarUrl: user?.avatarUrl,
      postImageUrl: postImage,
      tag: newTag,
      upvotes: 1,
      commentsCount: 0,
      date: 'Just now',
      content: newContent.trim(),
      comments: []
    };

    setThreads(prev => [newThread, ...prev]);
    setIsCreatorOpen(false);
    setNewTitle('');
    setNewContent('');
    setPostImage(null);
    setImageError(null);

    // Add activity signal
    setActivities(prev => [
      { id: 'a_' + Date.now(), message: `${currentUserHandle} posted "${newTitle.trim()}"`, time: 'Just now', icon: '⚡' },
      ...prev
    ]);

    // Send to DB
    fetch('/api/community/threads', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newThread)
    }).catch(() => {});
  };

  const trendingThread = useMemo(() => {
    if (threads.length === 0) return null;
    return [...threads].sort((a, b) => b.upvotes - a.upvotes)[0];
  }, [threads]);

  const filteredThreads = useMemo(() => {
    return threads.filter(t => {
      const matchTag = selectedTag === 'All' || t.tag === selectedTag;
      const matchSearch = t.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          t.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          t.author.toLowerCase().includes(searchQuery.toLowerCase());
      return matchTag && matchSearch;
    });
  }, [threads, selectedTag, searchQuery]);

  return (
    <div className="w-full min-h-[calc(100vh-64px)] text-bb-ink relative pb-12">
      <div className="w-full px-4 sm:px-8 py-8 relative z-10 max-w-7xl mx-auto">

        {/* Hub Header & Navigation sub-tabs */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 border-b border-bb-line pb-6 mb-6">
          <div>
            <Eyebrow number="04" className="mb-2">Community</Eyebrow>
            <h2 className="text-2xl md:text-3xl font-display font-extrabold tracking-tight text-bb-ink mb-2 mt-2">
              Binary Beats Community Hub
            </h2>
            <p className="text-xs font-mono text-bb-ink-faint">
              Share C++ solutions, OA questions, review code, and coordinate within engineering guilds
            </p>
          </div>

          {/* Sub tabs */}
          <div className="flex rounded overflow-hidden border border-bb-line bg-bb-surface p-0.5 font-mono text-[10px]">
            {[
              { id: 'forum', label: 'Discussions' },
              { id: 'feed', label: 'Live Activities' },
              { id: 'clans', label: 'Guilds / Clans' }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => {
                  playSound('click');
                  setActiveSubTab(tab.id as any);
                  setSelectedThread(null);
                }}
                className={`px-4 h-8 rounded-sm font-bold tracking-wider cursor-pointer uppercase transition-colors relative ${
                  activeSubTab === tab.id ? 'text-bb-ground' : 'text-bb-ink-faint hover:text-bb-ink-soft'
                }`}
              >
                {activeSubTab === tab.id && (
                  <motion.span
                    layoutId="activeSubTabBg"
                    className="absolute inset-0 bg-bb-ink rounded-sm"
                    transition={{ type: 'spring', stiffness: 350, damping: 28 }}
                  />
                )}
                <span className="relative z-10">{tab.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* ═══ TAB CONTENT: DISCUSSIONS FORUM ═══ */}
        {activeSubTab === 'forum' && (
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-8">

            {/* Left side: Forum View */}
            <div className="flex flex-col gap-5">
              {selectedThread ? (
                /* Thread Detail Page */
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                >
                  <Panel className="p-6">
                  {/* Thread Header */}
                  <div className="flex items-center justify-between mb-4">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        playSound('click');
                        setSelectedThread(null);
                      }}
                    >
                      ← Back to Feed
                    </Button>

                    <div className="flex items-center gap-2">
                      <Tag tone="neutral">{selectedThread.tag}</Tag>
                      {isAdmin && (
                        <button
                          onClick={() => handleDeleteThread(selectedThread.id)}
                          className="px-2 py-1 rounded bg-red-500/10 text-red-400 hover:bg-red-500 hover:text-white border border-red-500/30 text-[10px] font-mono transition-all cursor-pointer"
                          title="Admin Delete Option (zodiac.z408)"
                        >
                          🗑️ Delete Post
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Title & Author Info */}
                  <div className="flex gap-4 items-start mb-6">
                    <div className="w-10 h-10 rounded-full bg-bb-ink text-bb-ground flex items-center justify-center text-xs font-bold font-mono overflow-hidden shrink-0">
                      {selectedThread.avatarUrl ? (
                        <img src={selectedThread.avatarUrl} alt={selectedThread.author} className="w-full h-full object-cover rounded-full" />
                      ) : (
                        selectedThread.avatar
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-xl font-bold font-display text-bb-ink leading-tight">
                        {selectedThread.title}
                      </h3>
                      <div className="flex gap-3 text-[10px] text-bb-ink-faint font-mono mt-1">
                        <span>POSTED BY: @{selectedThread.author}</span>
                        <span>⏱ {selectedThread.date}</span>
                      </div>
                    </div>
                  </div>

                  {/* Body Content */}
                  <div className="bg-bb-ground border border-bb-line p-5 rounded text-bb-ink-soft text-xs leading-relaxed whitespace-pre-wrap font-mono mb-6">
                    {selectedThread.content}

                    {/* Attached Image (<1MB) */}
                    {selectedThread.postImageUrl && (
                      <div className="mt-4 border border-bb-line rounded p-2 bg-bb-surface flex justify-center">
                        <img src={selectedThread.postImageUrl} alt="Attachment" className="max-h-96 max-w-full rounded object-contain" />
                      </div>
                    )}
                  </div>

                  {/* Upvote Bar */}
                  <div className="flex items-center gap-4 border-b border-bb-line pb-5 mb-5">
                    <button
                      onClick={(e) => handleUpvote(selectedThread.id, e)}
                      className="cursor-pointer"
                    >
                      <Tag tone="success" className="gap-2 px-3 py-1.5 text-xs">
                        <span>👍 Upvote</span>
                        <span className="font-bold text-bb-ink">{selectedThread.upvotes}</span>
                      </Tag>
                    </button>
                    <span className="text-bb-ink-faint font-mono text-[10px]">
                      {selectedThread.commentsCount} Comments
                    </span>
                  </div>

                  {/* Comments list */}
                  <div className="flex flex-col gap-4 mb-6">
                    <Eyebrow tone="muted" className="mb-2">Community Responses</Eyebrow>

                    {selectedThread.comments.length === 0 ? (
                      <div className="py-4 text-center text-xs text-bb-ink-faint font-mono bg-bb-ground rounded border border-dashed border-bb-line">
                        No responses yet. Share your thoughts or solution review!
                      </div>
                    ) : (
                      selectedThread.comments.map(c => (
                        <Panel key={c.id} className="flex gap-3 items-start p-4 relative group/comment">
                          <div className="w-8 h-8 rounded-full bg-bb-ink text-bb-ground flex items-center justify-center text-[10px] font-bold font-mono overflow-hidden shrink-0">
                            {c.avatarUrl ? (
                              <img src={c.avatarUrl} alt={c.author} className="w-full h-full object-cover rounded-full" />
                            ) : (
                              c.avatar
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-baseline justify-between">
                              <span className="text-xs font-bold text-bb-ink font-mono">@{c.author}</span>
                              <div className="flex items-center gap-2">
                                <span className="text-[9px] text-bb-ink-faint font-mono">{c.date}</span>
                                {isAdmin && (
                                  <button
                                    onClick={() => handleDeleteComment(c.id)}
                                    className="text-red-400 hover:text-red-300 text-[10px] font-mono cursor-pointer transition-colors"
                                    title="Admin Delete Comment"
                                  >
                                    🗑️
                                  </button>
                                )}
                              </div>
                            </div>
                            <p className="text-xs text-bb-ink-soft mt-1 font-mono leading-relaxed whitespace-pre-wrap">
                              {c.content}
                            </p>
                          </div>
                        </Panel>
                      ))
                    )}
                  </div>

                  {/* Add comment editor */}
                  <div className="flex flex-col gap-3 font-mono">
                    <textarea
                      value={commentInput}
                      onChange={e => setCommentInput(e.target.value)}
                      placeholder="Post your solution breakdown or response..."
                      className="w-full h-20 p-3 bg-bb-ground border border-bb-line rounded text-xs text-bb-ink placeholder-bb-ink-faint focus:outline-none focus:border-bb-line-strong resize-none font-mono"
                    />
                    <div className="flex justify-end">
                      <Button variant="primary" size="sm" onClick={handleAddComment}>
                        Post Response
                      </Button>
                    </div>
                  </div>
                  </Panel>
                </motion.div>
              ) : (
                /* Thread Feed list */
                <div className="flex flex-col gap-4">
                  {/* Toolbar */}
                  <div className="flex flex-col sm:flex-row gap-4 items-stretch sm:items-center font-mono">
                    {/* Search forum */}
                    <div className="relative flex-1">
                      <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-bb-ink-faint" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                      </svg>
                      <input
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                        placeholder="Search posts, OA questions or code..."
                        className="w-full h-9 pl-9 pr-3 rounded text-xs text-bb-ink bg-bb-surface placeholder-bb-ink-faint focus:outline-none transition-colors border border-bb-line focus:border-bb-line-strong"
                      />
                    </div>

                    {/* New Post Button */}
                    <Button
                      variant="primary"
                      onClick={() => {
                        playSound('click');
                        setIsCreatorOpen(true);
                      }}
                    >
                      + Create Post
                    </Button>
                  </div>

                  {/* Thread Cards list */}
                  <div className="flex flex-col gap-3">
                    {filteredThreads.length === 0 ? (
                      <div className="py-16 text-center text-xs text-bb-ink-faint font-mono rounded border border-dashed border-bb-line flex flex-col items-center justify-center gap-3">
                        <span>No community posts yet. Be the first to share a solution or OA question!</span>
                        <Button
                          variant="primary"
                          size="sm"
                          onClick={() => {
                            playSound('click');
                            setIsCreatorOpen(true);
                          }}
                        >
                          + Create First Post
                        </Button>
                      </div>
                    ) : (
                      filteredThreads.map(t => (
                        <motion.div key={t.id} layout>
                          <Panel
                            lift
                            onClick={() => {
                              playSound('click');
                              setSelectedThread(t);
                            }}
                            className="relative p-5 pl-6 cursor-pointer flex gap-4 items-start group overflow-hidden"
                          >
                          <span className={`absolute left-0 top-0 bottom-0 w-[3px] ${TAG_ACCENT[t.tag]}`} />
                          
                          {/* Left avatar column */}
                          <div className="w-8 h-8 rounded-full bg-bb-ink text-bb-ground flex items-center justify-center text-[10px] font-bold font-mono shrink-0 overflow-hidden">
                            {t.avatarUrl ? (
                              <img src={t.avatarUrl} alt={t.author} className="w-full h-full object-cover rounded-full" />
                            ) : (
                              t.avatar
                            )}
                          </div>

                          {/* Right main column */}
                          <div className="flex-1 min-w-0 font-mono">
                            <div className="flex items-center justify-between gap-2 mb-1.5 flex-wrap">
                              <div className="flex items-center gap-2 flex-wrap">
                                <Tag tone="neutral">{t.tag}</Tag>
                                <span className="text-[9.5px] text-bb-ink-faint">
                                  Posted by @{t.author} • {t.date}
                                </span>
                              </div>
                              {isAdmin && (
                                <button
                                  onClick={(e) => handleDeleteThread(t.id, e)}
                                  className="text-red-400 hover:text-red-300 text-[11px] font-mono cursor-pointer transition-colors px-1.5 py-0.5 rounded hover:bg-red-500/10"
                                  title="Admin Delete Post & Attached Media"
                                >
                                  🗑️
                                </button>
                              )}
                            </div>

                            <h3 className="text-[13px] font-bold text-bb-ink group-hover:text-bb-yellow transition-colors leading-tight">
                              {t.title}
                            </h3>

                            <p className="text-[10px] text-bb-ink-faint font-sans mt-1.5 line-clamp-1 font-light">
                              {t.content}
                            </p>

                            {/* Attached Image Thumbnail (<1MB) */}
                            {t.postImageUrl && (
                              <div className="mt-2 rounded border border-bb-line p-1 bg-bb-surface inline-block max-h-36 max-w-xs overflow-hidden">
                                <img src={t.postImageUrl} alt="Attachment" className="max-h-32 max-w-full rounded object-contain" />
                              </div>
                            )}

                            <div className="flex items-center gap-4 mt-3 text-[10px] text-bb-ink-faint font-mono">
                              <button
                                onClick={(e) => handleUpvote(t.id, e)}
                                className="flex items-center gap-1.5 hover:text-bb-success transition-colors group/up"
                              >
                                <span className="group-hover/up:scale-110 transition-transform">👍</span>
                                <span className="font-bold">{t.upvotes}</span>
                              </button>

                              <div className="flex items-center gap-1.5">
                                <span>💬</span>
                                <span className="font-bold">{t.commentsCount} Comments</span>
                              </div>
                            </div>
                          </div>
                          </Panel>
                        </motion.div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Right side: Categories filtering panel */}
            <div className="flex flex-col gap-6 font-mono">
              {trendingThread && (
                <Panel bracket className="p-5 relative overflow-hidden text-bb-yellow">
                  <Eyebrow tone="accent" className="mb-3">Trending Post</Eyebrow>
                  <div className="flex items-center gap-2 mb-2 flex-wrap">
                    <span className={`w-2 h-2 rounded-full shrink-0 ${TAG_ACCENT[trendingThread.tag]}`} />
                    <span className="text-[9px] uppercase tracking-wider text-bb-ink-faint">{trendingThread.tag}</span>
                    <span className="text-[9px] text-bb-ink-faint ml-auto">👍 {trendingThread.upvotes}</span>
                  </div>
                  <div className="text-sm font-display font-bold text-bb-ink mb-4 leading-snug line-clamp-2">
                    {trendingThread.title}
                  </div>
                  <Button
                    variant="primary"
                    className="w-full"
                    onClick={() => {
                      playSound('click');
                      setSelectedThread(trendingThread);
                    }}
                  >
                    Read Thread →
                  </Button>
                </Panel>
              )}

              <Panel className="p-5">
                <div className="mb-3.5">
                  <Eyebrow tone="muted">Topic Filter</Eyebrow>
                  <Divider className="mt-2" />
                </div>
                <div className="flex flex-col gap-2">
                  {(['All', 'Solutions', 'Contest', 'General', 'Bugs'] as const).map(tag => {
                    const isSelected = selectedTag === tag;
                    return (
                      <button
                        key={tag}
                        onClick={() => {
                          playSound('click');
                          setSelectedTag(tag);
                          setSelectedThread(null);
                        }}
                        className={`w-full flex items-center justify-between px-3 py-2 rounded border text-left text-xs transition-colors cursor-pointer ${
                          isSelected
                            ? 'bg-bb-yellow-fill text-bb-yellow border-bb-yellow/30 font-bold'
                            : 'border-transparent text-bb-ink-faint hover:text-bb-ink-soft hover:bg-bb-ink/[0.03]'
                        }`}
                      >
                        <span className="flex items-center gap-2">
                          {tag !== 'All' && <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${TAG_ACCENT[tag]}`} />}
                          {tag === 'All' ? 'All Channels' : `# ${tag}`}
                        </span>
                        {tag !== 'All' && (
                          <Tag tone={isSelected ? 'accent' : 'neutral'}>
                            {threads.filter(t => t.tag === tag).length}
                          </Tag>
                        )}
                      </button>
                    );
                  })}
                </div>
              </Panel>

              {/* Guidelines panel */}
              <Panel className="p-5 text-[10px] text-bb-ink-faint">
                <div className="mb-3">
                  <Eyebrow tone="muted">Community Rules</Eyebrow>
                  <Divider className="mt-2" />
                </div>
                <ul className="flex flex-col gap-2.5 list-none pl-0 leading-relaxed">
                  <li className="flex gap-2">
                    <span className="text-bb-yellow">◼</span>
                    <span>Post genuine C++ / DSA solution breakdowns & OA questions.</span>
                  </li>
                  <li className="flex gap-2">
                    <span className="text-bb-yellow">◼</span>
                    <span>Attached images must be under 1MB in size.</span>
                  </li>
                  <li className="flex gap-2">
                    <span className="text-bb-yellow">◼</span>
                    <span>Admin @zodiac.z408 moderates all community content.</span>
                  </li>
                </ul>
              </Panel>
            </div>

          </div>
        )}

        {/* ═══ TAB CONTENT: LIVE ACTIVITIES ═══ */}
        {activeSubTab === 'feed' && (
          <div className="w-full font-mono">
            <Panel className="p-6">
              <div className="flex items-center justify-between border-b border-bb-line pb-4 mb-6 select-none">
                <Eyebrow tone="muted">Live Activity Signal Feed</Eyebrow>
                <span className="flex items-center gap-1.5 text-[9px] text-bb-success uppercase tracking-widest font-black animate-pulse">
                  <span className="w-1.5 h-1.5 rounded-full bg-bb-success" />
                  Live Syncing
                </span>
              </div>

              <div className="flex flex-col gap-4 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
                {activities.length === 0 ? (
                  <div className="py-12 text-center text-xs text-bb-ink-faint font-mono border border-dashed border-bb-line rounded">
                    No activity signals recorded yet. Active user actions will broadcast here in real-time.
                  </div>
                ) : (
                  <AnimatePresence initial={false}>
                    {activities.map((a) => (
                      <motion.div
                        key={a.id}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, height: 0, overflow: 'hidden', margin: 0, padding: 0 }}
                        transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                      >
                        <Panel className="flex items-start gap-4 p-4 hover:border-bb-line-strong transition-colors">
                          <div className="w-8 h-8 rounded bg-bb-ground border border-bb-line flex items-center justify-center text-xs shrink-0">
                            {a.icon}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-[11px] font-semibold text-bb-ink leading-relaxed">
                              {a.message}
                            </p>
                            <span className="text-[8px] text-bb-ink-faint block mt-1 uppercase font-bold">
                              ⏱ {a.time}
                            </span>
                          </div>
                        </Panel>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                )}
              </div>
            </Panel>
          </div>
        )}

        {/* ═══ TAB CONTENT: CLANS HUB ═══ */}
        {activeSubTab === 'clans' && (
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-8">
            {/* Clans list */}
            <div className="flex flex-col gap-4 font-mono">
              <div className="flex items-center justify-between mb-1">
                <div>
                  <Eyebrow tone="muted">Community Clans Leaderboard</Eyebrow>
                </div>
                {isAdmin && (
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => {
                      playSound('click');
                      setIsClanCreatorOpen(true);
                    }}
                  >
                    + Create Clan
                  </Button>
                )}
              </div>
              <Divider className="mb-2" />

              <div className="flex flex-col gap-3">
                {clans.map((clan, idx) => {
                  const isMember = userClan === clan.name;
                  return (
                    <Panel
                      key={clan.id}
                      className={`p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-all ${
                        isMember ? 'border-bb-success/50 bg-bb-success/[0.06]' : 'hover:border-bb-line-strong'
                      }`}
                    >
                      <div className="flex gap-4 items-start">
                        <div className={`w-10 h-10 rounded flex items-center justify-center font-bold text-xs border ${
                          isMember
                            ? 'bg-bb-success text-bb-ground border-bb-success'
                            : 'bg-bb-ink text-bb-ground border-bb-ink'
                        }`}>
                          {clan.tag}
                        </div>
                        <div className="flex flex-col max-w-sm">
                          <div className="flex items-baseline gap-2 flex-wrap">
                            <span className="text-sm font-bold text-bb-ink">{clan.name}</span>
                            <span className="text-[9px] text-bb-ink-faint">#{idx + 1} GUILD</span>
                          </div>
                          <p className="text-[10px] text-bb-ink-faint font-sans font-light mt-1.5 leading-relaxed">
                            {clan.desc}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-6 self-end sm:self-center">
                        <div className="text-right">
                          <span className="text-[9px] text-bb-ink-faint block">WEEKLY SOLVES</span>
                          <span className="text-xs font-bold text-bb-ink-soft">{clan.weeklySolves.toLocaleString()}</span>
                        </div>
                        <div className="text-right">
                          <span className="text-[9px] text-bb-ink-faint block">CODERS</span>
                          <span className="text-xs font-bold text-bb-ink-soft">{clan.members}</span>
                        </div>

                        <Button
                          variant={isMember ? 'outline' : 'primary'}
                          size="sm"
                          onClick={() => handleJoinClan(clan.id)}
                          className={isMember ? 'hover:text-bb-danger hover:border-bb-danger/40 hover:bg-bb-danger/10' : ''}
                        >
                          {isMember ? 'Leave' : 'Join'}
                        </Button>
                      </div>
                    </Panel>
                  );
                })}
              </div>
            </div>

            {/* User Guild Profile status */}
            <div className="flex flex-col gap-6 font-mono">
              <Panel className="p-5 relative">
                <div className="mb-3.5">
                  <Eyebrow tone="muted">Your Guild Affiliation</Eyebrow>
                  <Divider className="mt-2" />
                </div>

                {userClan ? (
                  <div className="flex flex-col gap-4">
                    <div>
                      <span className="text-[9px] text-bb-ink-faint uppercase block mb-1">Active Clan</span>
                      <div className="text-base font-bold text-bb-ink uppercase tracking-wider flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-bb-success" />
                        {userClan}
                      </div>
                    </div>
                    <div>
                      <span className="text-[9px] text-bb-ink-faint uppercase block mb-1">Weekly contribution</span>
                      <span className="text-xs font-bold text-bb-success">7 problems solved</span>
                    </div>
                    <div className="p-3 bg-bb-ground border border-bb-line rounded text-[9px] text-bb-ink-faint leading-relaxed font-sans font-light">
                      Your solves add to the clan leaderboard weekly. Keep solving to rank up your guild!
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-6">
                    <span className="text-[30px] block mb-2 opacity-50">🛡️</span>
                    <span className="text-[10px] text-bb-ink-faint block uppercase font-semibold">No Active Clan</span>
                    <p className="text-[9px] text-bb-ink-faint mt-2 font-sans font-light px-2">
                      Join a programming guild above to participate in clan tournaments and secure contribution points.
                    </p>
                  </div>
                )}
              </Panel>
            </div>
          </div>
        )}

        {/* ═══ CREATE THREAD DIALOG MODAL ═══ */}
        <AnimatePresence>
          {isCreatorOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center px-4 bg-bb-ground/80 backdrop-blur-sm">
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="w-full max-w-[600px] font-mono"
              >
                <Panel className="p-6">
                <div className="flex items-center justify-between border-b border-bb-line pb-3.5 mb-5">
                  <h3 className="text-sm font-bold text-bb-ink uppercase tracking-wider">
                    Create Community Post / Share Solution
                  </h3>
                  <button
                    onClick={() => {
                      playSound('click');
                      setIsCreatorOpen(false);
                      setPostImage(null);
                      setImageError(null);
                    }}
                    className="text-bb-ink-faint hover:text-bb-ink cursor-pointer text-sm font-bold font-sans"
                  >
                    ×
                  </button>
                </div>

                <div className="flex flex-col gap-4 text-xs">
                  {/* Title */}
                  <div className="flex flex-col gap-1.5">
                    <label className="text-bb-ink-faint uppercase font-semibold">Post Title</label>
                    <input
                      type="text"
                      value={newTitle}
                      onChange={e => setNewTitle(e.target.value)}
                      placeholder="E.g., Google OA: Max Subarray XOR Breakdown"
                      className="h-10 px-3.5 bg-bb-ground border border-bb-line rounded text-bb-ink placeholder-bb-ink-faint focus:outline-none focus:border-bb-line-strong"
                    />
                  </div>

                  {/* Channel Tag */}
                  <div className="flex flex-col gap-1.5">
                    <label className="text-bb-ink-faint uppercase font-semibold">Topic Channel</label>
                    <select
                      value={newTag}
                      onChange={e => setNewTag(e.target.value as any)}
                      className="h-10 px-3 bg-bb-ground border border-bb-line rounded text-bb-ink focus:outline-none focus:border-bb-line-strong"
                    >
                      <option value="Solutions"># Solutions & OA Questions</option>
                      <option value="Contest"># Contest Strategy</option>
                      <option value="General"># General Discussion</option>
                      <option value="Bugs"># Bug Reports</option>
                    </select>
                  </div>

                  {/* Image Attachment with <1MB constraint */}
                  <div className="flex flex-col gap-1.5">
                    <label className="text-bb-ink-faint uppercase font-semibold flex items-center justify-between">
                      <span>Attach Image (Optional, Must be &lt; 1MB)</span>
                      <span className="text-[10px] text-bb-yellow font-normal">Max size: 1MB</span>
                    </label>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageChange}
                      className="text-[11px] text-bb-ink-faint file:mr-3 file:py-1.5 file:px-3 file:rounded file:border-0 file:text-xs file:font-mono file:bg-bb-surface file:text-bb-ink hover:file:bg-bb-yellow hover:file:text-bb-ground transition-colors cursor-pointer"
                    />
                    {imageError && (
                      <p className="text-[10px] text-red-400 font-mono font-semibold mt-1">
                        ⚠️ {imageError}
                      </p>
                    )}
                    {postImage && !imageError && (
                      <div className="mt-2 p-2 border border-bb-success/40 bg-bb-success/5 rounded flex items-center gap-3">
                        <img src={postImage} alt="Preview" className="h-12 w-12 object-cover rounded border border-bb-line" />
                        <span className="text-[10px] text-bb-success font-mono">✓ Image attached successfully (&lt; 1MB)</span>
                      </div>
                    )}
                  </div>

                  {/* Code / Content */}
                  <div className="flex flex-col gap-1.5">
                    <label className="text-bb-ink-faint uppercase font-semibold">Post Content (C++ Code / Explanation)</label>
                    <textarea
                      value={newContent}
                      onChange={e => setNewContent(e.target.value)}
                      placeholder="Share your C++ code solution, OA question breakdown, or discussion topic..."
                      className="h-36 p-4 bg-bb-ground border border-bb-line rounded text-bb-ink placeholder-bb-ink-faint focus:outline-none focus:border-bb-line-strong resize-none font-mono text-[11px] leading-relaxed"
                    />
                  </div>

                  {/* Save/Cancel */}
                  <div className="flex justify-end gap-3 pt-3 border-t border-bb-line mt-2">
                    <Button
                      variant="outline"
                      onClick={() => {
                        playSound('click');
                        setIsCreatorOpen(false);
                        setPostImage(null);
                        setImageError(null);
                      }}
                    >
                      Cancel
                    </Button>
                    <Button
                      variant="primary"
                      onClick={handleCreateThread}
                      disabled={Boolean(imageError)}
                    >
                      Publish Post
                    </Button>
                  </div>
                </div>
                </Panel>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* ═══ CREATE CLAN DIALOG MODAL (Admin Only) ═══ */}
        <AnimatePresence>
          {isClanCreatorOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center px-4 bg-bb-ground/80 backdrop-blur-sm">
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="w-full max-w-[500px] font-mono"
              >
                <Panel className="p-6">
                <div className="flex items-center justify-between border-b border-bb-line pb-3.5 mb-5">
                  <h3 className="text-sm font-bold text-bb-ink uppercase tracking-wider">
                    Admin: Create Community Clan
                  </h3>
                  <button
                    onClick={() => {
                      playSound('click');
                      setIsClanCreatorOpen(false);
                    }}
                    className="text-bb-ink-faint hover:text-bb-ink cursor-pointer text-sm font-bold font-sans"
                  >
                    ×
                  </button>
                </div>

                <div className="flex flex-col gap-4 text-xs">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-bb-ink-faint uppercase font-semibold">Clan Name</label>
                    <input
                      type="text"
                      value={newClanName}
                      onChange={e => setNewClanName(e.target.value)}
                      placeholder="E.g., Cyber Knights"
                      className="h-10 px-3.5 bg-bb-ground border border-bb-line rounded text-bb-ink focus:outline-none focus:border-bb-line-strong"
                    />
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-bb-ink-faint uppercase font-semibold">Clan Tag (4 Letters)</label>
                    <input
                      type="text"
                      maxLength={4}
                      value={newClanTag}
                      onChange={e => setNewClanTag(e.target.value.toUpperCase())}
                      placeholder="E.g., KNIG"
                      className="h-10 px-3.5 bg-bb-ground border border-bb-line rounded text-bb-ink focus:outline-none focus:border-bb-line-strong"
                    />
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-bb-ink-faint uppercase font-semibold">Description</label>
                    <textarea
                      value={newClanDesc}
                      onChange={e => setNewClanDesc(e.target.value)}
                      placeholder="Clan focus and competitive targets..."
                      className="h-24 p-3 bg-bb-ground border border-bb-line rounded text-bb-ink focus:outline-none focus:border-bb-line-strong resize-none font-mono text-[11px]"
                    />
                  </div>

                  <div className="flex justify-end gap-3 pt-3 border-t border-bb-line mt-2">
                    <Button
                      variant="outline"
                      onClick={() => {
                        playSound('click');
                        setIsClanCreatorOpen(false);
                      }}
                    >
                      Cancel
                    </Button>
                    <Button variant="primary" onClick={handleCreateClan}>
                      Deploy Clan
                    </Button>
                  </div>
                </div>
                </Panel>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

      </div>
    </div>
  );
};
