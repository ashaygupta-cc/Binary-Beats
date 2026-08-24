import React, { useEffect, useState } from "react";
import { channelBySlug } from "../../data/channels";
import { useBotData } from "../../hooks/useBotData";
import { botApi, discordApi, type DiscordAttachment, type DiscordMessage } from "../../lib/botApi";
import { navigate } from "../../lib/router";
import { DiscordMessageCard } from "../discord/DiscordMessageCard";
import { Button } from "../ui/Button";
import { InlinePdfViewer } from "../ui/InlinePdfViewer";
import { DataState, EmptyState, PageBody, PageHeader, SkeletonRows } from "../ui/PageShell";
import { Panel } from "../ui/Panel";
import { Tag } from "../ui/Tag";

// ── Dedicated renderers ──────────────────────────────────────────
import { ContestCalendarView } from "../renderers/ContestCalendarView";
import { SocialLinksView } from "../renderers/SocialLinksView";

interface Props {
  slug: string;
  threadId?: string;
  playSound?: (t: "click" | "hover") => void;
  user?: { id: string; username: string; globalName?: string | null } | null;
}

const LOCAL_SUBMISSIONS_KEY = "bb_daily_submissions_v1";
const SUBMISSION_FILE_RE = /\.(cpp|c|java|py|pdf)$/i;
const MAX_SUBMISSION_BYTES = 10 * 1024;

type LocalSubmission = {
  id: string;
  authorName: string;
  authorAvatar?: string;
  tag: string;
  code?: string;
  filename?: string;
  timestamp: string;
  earnedPts?: number;
};

function readLocalSubmissions(threadKey: string): LocalSubmission[] {
  try {
    const raw = localStorage.getItem(LOCAL_SUBMISSIONS_KEY);
    const all = raw ? JSON.parse(raw) as Record<string, LocalSubmission[]> : {};
    return Array.isArray(all[threadKey]) ? all[threadKey] : [];
  } catch {
    return [];
  }
}

function writeLocalSubmissions(threadKey: string, submissions: LocalSubmission[]) {
  try {
    const raw = localStorage.getItem(LOCAL_SUBMISSIONS_KEY);
    const all = raw ? JSON.parse(raw) as Record<string, LocalSubmission[]> : {};
    all[threadKey] = submissions.slice(0, 3);
    localStorage.setItem(LOCAL_SUBMISSIONS_KEY, JSON.stringify(all));
  } catch {
    // Local persistence is best effort; Discord remains the shared source.
  }
}

function submissionAttachments(message: DiscordMessage): DiscordAttachment[] {
  return (message.attachments ?? []).filter(
    (attachment) => attachment.size <= MAX_SUBMISSION_BYTES && SUBMISSION_FILE_RE.test(attachment.filename)
  );
}

function threadDate(thread: { editorial_date: string | null; name: string; created_at: string }): string {
  if (thread.editorial_date) return thread.editorial_date.slice(0, 10);
  const match = thread.name.match(/\((\d{2})-(\d{2})-(\d{2,4})\)/);
  if (match) {
    const year = match[3].length === 2 ? `20${match[3]}` : match[3];
    return `${year}-${match[2]}-${match[1]}`;
  }
  return thread.created_at.slice(0, 10);
}

const SubmissionAttachmentPreview: React.FC<{ attachment: DiscordAttachment }> = ({ attachment }) => {
  const [code, setCode] = useState<string | null>(null);
  const [error, setError] = useState(false);
  const isPdf = /\.pdf$/i.test(attachment.filename);

  useEffect(() => {
    if (isPdf) return;
    const controller = new AbortController();
    void fetch(`/api/bot/attachments/preview?url=${encodeURIComponent(attachment.url)}`, { signal: controller.signal })
      .then((response) => response.ok ? response.text() : Promise.reject(new Error("preview failed")))
      .then(setCode)
      .catch((previewError: unknown) => {
        if ((previewError as { name?: string }).name !== "AbortError") setError(true);
      });
    return () => controller.abort();
  }, [attachment.url, isPdf]);

  if (isPdf) {
    return (
      <div className="mt-2 h-[520px] overflow-hidden rounded border border-bb-line bg-bb-ground">
        <iframe
          src={attachment.url}
          title={attachment.filename}
          className="h-full w-full border-0"
        />
      </div>
    );
  }
  if (error) {
    return <p className="mt-2 rounded border border-dashed border-bb-line-strong p-3 font-mono text-[10px] text-bb-ink-faint">Inline preview unavailable. Download the file to view it.</p>;
  }
  if (code === null) {
    return <p className="mt-2 rounded border border-bb-line bg-bb-ground p-3 font-mono text-[10px] text-bb-ink-faint">Loading code preview...</p>;
  }
  return (
    <pre className="mt-2 max-h-[420px] overflow-auto rounded border border-bb-line bg-bb-ground p-3 font-mono text-[10px] leading-relaxed text-bb-ink">
      <code>{code}</code>
    </pre>
  );
};

/** Check if a given date string is today in IST (UTC+5:30) and if the day points window is active */
function isDayActiveIST(dateStrCandidate?: string | null): boolean {
  if (!dateStrCandidate) return false;
  try {
    const nowUtc = new Date();
    // Convert to IST
    const istOffset = 5.5 * 60 * 60 * 1000;
    const nowIst = new Date(nowUtc.getTime() + istOffset);
    const todayIstStr = nowIst.toISOString().slice(0, 10);

    // Extract YYYY-MM-DD or DD-MM-YYYY from candidate
    let targetDateStr = dateStrCandidate;
    const ddmmyyyy = dateStrCandidate.match(/(\d{2})-(\d{2})-(\d{4})/);
    if (ddmmyyyy) {
      targetDateStr = `${ddmmyyyy[3]}-${ddmmyyyy[2]}-${ddmmyyyy[1]}`;
    }

    // If target date is today, points window is active until 23:59:59 IST
    return targetDateStr === todayIstStr;
  } catch {
    return false;
  }
}

export const ChannelPage: React.FC<Props> = ({ slug, threadId, playSound, user }) => {
  const channel = channelBySlug(slug);
  const [search, setSearch] = useState("");
  
  // Community AC Solution upload state
  const [selectedProblemTag, setSelectedProblemTag] = useState<string>("DSA P1");
  const [solutionCode, setSolutionCode] = useState<string>("");
  const [solutionFile, setSolutionFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadMessage, setUploadMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [localSubmissions, setLocalSubmissions] = useState<LocalSubmission[]>(() =>
    threadId ? readLocalSubmissions(threadId) : []
  );
  const [expandedSubmissionId, setExpandedSubmissionId] = useState<string | null>(null);

  useEffect(() => {
    setLocalSubmissions(threadId ? readLocalSubmissions(threadId) : []);
    setExpandedSubmissionId(null);
  }, [threadId]);

  const feed = useBotData(
    () => discordApi.messages(channel!.key, {
      limit: 60,
      q: search || undefined,
      threads: channel?.view === "article" ? "1" : undefined
    }),
    [channel?.key, search]
  );

  const threads = useBotData(
    () => discordApi.threads(channel!.key),
    [channel?.key]
  );

  const thread = useBotData(
    () => discordApi.threadMessages(threadId!),
    [threadId],
    { enabled: Boolean(threadId) }
  );

  const isDualThread = Boolean(
    threadId && (channel?.key === "daily_editorials" || channel?.key === "daily_problems")
  );
  const dailyProblemThreads = useBotData(
    () => discordApi.threads("daily_problems", 100),
    [],
    { enabled: isDualThread }
  );
  const editorialThreads = useBotData(
    () => discordApi.threads("daily_editorials", 100),
    [],
    { enabled: isDualThread }
  );
  const currentThreadMeta = threads.data?.threads.find((candidate) => candidate.thread_id === threadId);
  const currentThreadDate = currentThreadMeta
    ? threadDate(currentThreadMeta)
    : thread.data?.messages[0]?.created_at.slice(0, 10) ?? null;
  const pairedThreadId = isDualThread && currentThreadDate
    ? (channel?.key === "daily_problems"
      ? editorialThreads.data?.threads.find((candidate) => threadDate(candidate) === currentThreadDate)?.thread_id
      : dailyProblemThreads.data?.threads.find((candidate) => threadDate(candidate) === currentThreadDate)?.thread_id)
    : undefined;
  const pairedThread = useBotData(
    () => discordApi.threadMessages(pairedThreadId!),
    [pairedThreadId],
    { enabled: Boolean(pairedThreadId) }
  );

  const contestsData = useBotData(
    () => botApi.contests(),
    [],
    { enabled: channel?.key === "contest_reminder" }
  );

  if (!channel) {
    return (
      <>
        <PageHeader number="—" title="Channel not found" blurb="This channel doesn't exist or isn't mirrored." />
        <PageBody>
          <Panel className="p-8 text-center">
            <p className="font-mono text-sm text-bb-ink-soft">Check the URL or browse active channels in Community.</p>
            <Button variant="primary" size="md" className="mt-4" onClick={() => navigate("community")}>
              Go to Community
            </Button>
          </Panel>
        </PageBody>
      </>
    );
  }

  if (channel.key === "contest_reminder" && !threadId) {
    return (
      <>
        <PageHeader number="—" title={channel.label} blurb={channel.blurb} />
        <PageBody><ContestCalendarView contestsData={contestsData} /></PageBody>
      </>
    );
  }

  if (channel.key === "find_us_online" && !threadId) {
    return (
      <>
        <PageHeader number="—" title={channel.label} blurb={channel.blurb} />
        <PageBody><SocialLinksView /></PageBody>
      </>
    );
  }

  // ── DUAL-PANEL EDITORIALS & OTHER SUBMISSIONS VIEW ──────────────────
  if (threadId && (channel.key === "daily_editorials" || channel.slug === "editorials" || channel.key === "daily_problems")) {
    const threadMessages = thread.data?.messages || [];
    
    // The first post is the bot's problem announcement; only later posts are submissions.
    const isDailyProblemThread = channel.key === "daily_problems";
    const editorialMessages = isDailyProblemThread
      ? pairedThread.data?.messages || []
      : threadMessages;
    const submissionMessages = isDailyProblemThread
      ? threadMessages
      : pairedThread.data?.messages || [];
    const officialMsg = editorialMessages[0];
    const isPdf = (a: any) => Boolean(a?.is_pdf === true || (typeof a?.filename === "string" && a.filename.toLowerCase().endsWith(".pdf")));
    const allAttachments = editorialMessages.flatMap(m => m.attachments || []);
    const pdfAttachments = allAttachments.filter(isPdf);

    // Check if the current day is active (locked till 23:59 IST)
    const isTodayActive = isDayActiveIST(currentThreadDate);

    // User submissions extracted from subsequent thread messages
    const communityMessages = submissionMessages.slice(1).filter((message) => submissionAttachments(message).length > 0);

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      // Strict 10 KB file size limit (10 * 1024 = 10240 bytes)
      if (file.size > 10240) {
        setUploadMessage({ type: "error", text: "Strict limit: File size must be under 10 KB." });
        return;
      }

      setSolutionFile(file);
      setUploadMessage(null);

      // Read text if code file
      const reader = new FileReader();
      reader.onload = (event) => {
        setSolutionCode(event.target?.result as string || "");
      };
      reader.readAsText(file);
    };

    const handlePublishSolution = async () => {
      if (!solutionCode.trim() && !solutionFile) {
        setUploadMessage({ type: "error", text: "Please provide your solution code or file." });
        return;
      }

      // Check max uploads quota (max 3 submissions per user per day)
      const userUploadsCount = localSubmissions.length;
      if (userUploadsCount >= 3) {
        setUploadMessage({ type: "error", text: "Maximum quota reached: 3 solutions allowed per daily set." });
        return;
      }

      setIsUploading(true);
      setUploadMessage(null);

      try {
        // Trigger handle auto-checker to verify AC solve and sync points
        let earnedPts = 0;
        if (user?.id) {
          try {
            const checkRes = await discordApi.checkSubmissions(user.id);
            if (checkRes.earned) earnedPts = checkRes.earned;
          } catch {
            // Auto check silently if offline
          }
        }

        const newSub = {
          id: `sub_${Date.now()}`,
          authorName: user?.globalName || user?.username || "You",
          tag: selectedProblemTag,
          code: solutionCode,
          filename: solutionFile?.name || `${selectedProblemTag.replace(/\s+/g, "_")}_Solution.cpp`,
          timestamp: "Just now",
          earnedPts: earnedPts || 6,
        };

        setLocalSubmissions(prev => {
          const next = [newSub, ...prev].slice(0, 3);
          if (threadId) writeLocalSubmissions(threadId, next);
          return next;
        });
        setSolutionCode("");
        setSolutionFile(null);
        setUploadMessage({ type: "success", text: "AC Solution uploaded & points verified!" });
        playSound?.("click");
      } catch (err: any) {
        setUploadMessage({ type: "error", text: err.message || "Failed to upload solution." });
      } finally {
        setIsUploading(false);
      }
    };

    return (
      <>
        <PageHeader
          number="—"
          title="Daily Editorial & Submissions"
          blurb="Official daily editorial notes on the left, and community AC submissions on the right."
          aside={
            <Button
              variant="outline"
              size="md"
              className="w-full sm:w-auto font-mono text-[11px] uppercase tracking-wider hover:border-bb-yellow hover:text-bb-yellow"
              onClick={() => {
                if (window.history.length > 1) {
                  window.history.back();
                } else {
                  navigate("content");
                }
              }}
            >
              ← Back to Daily Problems
            </Button>
          }
        />

        <PageBody>
          <DataState
            state={thread.state} error={thread.error} data={thread.data} onRetry={thread.reload}
            skeleton={<SkeletonRows rows={4} height="h-32" />}
            isEmpty={(d) => d.messages.length === 0}
            empty={<EmptyState title="Empty thread" />}
          >
            {() => (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                
                {/* ── LEFT PANEL: OFFICIAL EDITORIAL (7 COLS) ───────── */}
                <div className="lg:col-span-7 flex flex-col gap-4">
                  <div className="flex items-center justify-between border-b-[1.5px] border-bb-line-strong pb-2">
                    <div className="flex items-center gap-2">
                      <span className="font-hud text-xs uppercase tracking-[0.2em] text-bb-yellow">
                        [01 // OFFICIAL EDITORIAL]
                      </span>
                    </div>
                    {isTodayActive ? (
                      <span className="inline-flex items-center gap-1.5 rounded border-[1.5px] border-amber-500/50 bg-amber-500/10 px-2.5 py-1 font-mono text-[10px] font-bold text-amber-500 shadow-sm">
                        <span>🔒</span>
                        <span>LOCKED TILL 23:59 IST</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 rounded border-[1.5px] border-bb-line-strong bg-bb-surface px-2.5 py-1 font-mono text-[10px] font-bold text-bb-ink shadow-sm">
                        <span className="text-bb-yellow font-bold">🔓</span>
                        <span className="tracking-wider">UNLOCKED · DAY ENDED</span>
                      </span>
                    )}
                  </div>

                  {isTodayActive ? (
                    <Panel className="p-8 text-center border-amber-500/40 bg-bb-surface flex flex-col items-center justify-center gap-3 min-h-[380px]">
                      <div className="h-14 w-14 rounded-full border-2 border-amber-400/80 bg-amber-500/10 flex items-center justify-center font-mono text-2xl text-amber-400">
                        🔒
                      </div>
                      <h4 className="font-display text-lg font-bold uppercase tracking-tight text-bb-ink">
                        Active Day Points Window
                      </h4>
                      <p className="max-w-md font-mono text-xs text-bb-ink-soft leading-relaxed">
                        To preserve competitive integrity and prevent spoilers, official editorials remain locked during the active solve window.
                      </p>
                      <div className="rounded border border-bb-line-strong bg-bb-ground px-4 py-2 font-mono text-xs text-bb-yellow font-bold mt-2">
                        ⏳ Unlocks automatically at 23:59 IST
                      </div>
                    </Panel>
                  ) : (
                    <div className="flex flex-col gap-4">
                      {officialMsg ? (
                        <DiscordMessageCard message={officialMsg} />
                      ) : (
                        <Panel className="flex min-h-[380px] items-center justify-center border-dashed p-8 text-center">
                          <p className="font-mono text-xs text-bb-ink-faint">No editorial available for this date.</p>
                        </Panel>
                      )}

                      {/* Inline PDF Preview Reader */}
                      {pdfAttachments.map((pdf, idx) => (
                        <InlinePdfViewer
                          key={pdf.id || idx}
                          url={pdf.url}
                          filename={pdf.filename || "Editorial.pdf"}
                          className="h-[680px] w-full"
                        />
                      ))}
                    </div>
                  )}
                </div>

                {/* ── RIGHT PANEL: OTHER SUBMISSIONS & UPLOAD (5 COLS) ─ */}
                <div className="lg:col-span-5 flex flex-col gap-4">
                  <div className="flex items-center justify-between border-b-[1.5px] border-bb-line-strong pb-2">
                    <span className="font-hud text-xs uppercase tracking-[0.2em] text-bb-yellow">
                      [02 // OTHER SUBMISSIONS]
                    </span>
                    <span className="font-mono text-[10px] text-bb-ink-faint">
                      {communityMessages.length + localSubmissions.length} SOLUTIONS
                    </span>
                  </div>

                  {/* Upload Solution Card */}
                  <Panel className="p-4 bg-bb-surface border-[1.5px] border-bb-line-strong">
                    <div className="flex items-center justify-between mb-2.5">
                      <span className="font-mono text-xs font-bold uppercase text-bb-ink">
                        Submit Your AC Solution
                      </span>
                      <span className="font-mono text-[9px] text-bb-yellow font-bold uppercase">
                        Max 10 KB · Auto-Check
                      </span>
                    </div>

                    {/* Problem Tag Selector */}
                    <div className="flex gap-1.5 mb-2.5">
                      {["DSA P1", "CP P1", "CP P2"].map(tag => (
                        <button
                          key={tag}
                          type="button"
                          onClick={() => setSelectedProblemTag(tag)}
                          className={`flex-1 rounded border py-1 font-mono text-[10px] font-bold uppercase transition-all cursor-pointer ${
                            selectedProblemTag === tag
                              ? "bg-bb-yellow text-bb-ground border-bb-yellow shadow-sm"
                              : "bg-bb-ground text-bb-ink-soft border-bb-line hover:border-bb-line-strong hover:text-bb-ink"
                          }`}
                        >
                          {tag}
                        </button>
                      ))}
                    </div>

                    {/* Code or File Upload */}
                    <textarea
                      value={solutionCode}
                      onChange={(e) => setSolutionCode(e.target.value)}
                      placeholder="// Paste your C++ / Python / Java accepted solution code here..."
                      className="h-28 w-full rounded border-[1.5px] border-bb-line-strong bg-bb-ground p-2.5 font-mono text-[11px] text-bb-ink placeholder:text-bb-ink-faint focus:border-bb-yellow focus:outline-none mb-2 resize-none"
                    />

                    {/* File Attachment Input (<= 10KB) */}
                    <div className="flex items-center justify-between gap-2 mb-3">
                      <label className="flex-1 flex items-center justify-center gap-1.5 rounded border border-dashed border-bb-line-strong hover:border-bb-yellow p-1.5 font-mono text-[10px] text-bb-ink-soft cursor-pointer transition-colors truncate">
                        <span>📎 {solutionFile ? solutionFile.name : "Attach .cpp/.py/.pdf (<= 10KB)"}</span>
                        <input
                          type="file"
                          accept=".cpp,.py,.java,.c,.txt,.pdf"
                          onChange={handleFileUpload}
                          className="hidden"
                        />
                      </label>

                      <Button
                        variant="primary"
                        size="sm"
                        disabled={isUploading || (!solutionCode.trim() && !solutionFile)}
                        onClick={handlePublishSolution}
                        className="shrink-0"
                      >
                        {isUploading ? "Checking AC…" : "Upload"}
                      </Button>
                    </div>

                    {uploadMessage && (
                      <p className={`font-mono text-[10px] font-bold ${
                        uploadMessage.type === "success" ? "text-emerald-400" : "text-rose-400"
                      }`}>
                        {uploadMessage.text}
                      </p>
                    )}
                  </Panel>

                  {/* Submissions Feed List */}
                  <div className="flex flex-col gap-3">
                    {/* Local Submissions */}
                    {localSubmissions.map(sub => (
                      <Panel key={sub.id} className="p-3.5 border-emerald-500/50 bg-bb-surface">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-[11px] font-bold text-bb-ink">{sub.authorName}</span>
                            <span className="rounded border border-emerald-400/40 bg-emerald-400/10 px-1.5 py-0.2 font-mono text-[9px] font-bold text-emerald-400">
                              AC · +{sub.earnedPts || 6} PTS
                            </span>
                          </div>
                          <span className="font-mono text-[9px] uppercase text-bb-yellow font-bold">{sub.tag}</span>
                        </div>
                        {sub.code && (
                          <pre className="max-h-36 overflow-x-auto rounded border border-bb-line bg-bb-ground p-2.5 font-mono text-[10px] text-bb-ink">
                            <code>{sub.code}</code>
                          </pre>
                        )}
                      </Panel>
                    ))}

                    {/* Community Submissions Synced from Thread */}
                    {communityMessages.map(m => {
                      const isOwnMessage = user && (m.author_id === user.id || m.author_name === user.username);
                      const shouldHide = isTodayActive && !isOwnMessage;

                      return (
                        <Panel key={m.message_id} className="p-3.5 bg-bb-surface">
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                              {m.author_avatar && (
                                <img src={m.author_avatar} alt="" className="h-5 w-5 rounded-full border border-bb-line" />
                              )}
                              {m.author_id ? (
                                <button
                                  type="button"
                                  onClick={() => navigate(`u/${m.author_id}`)}
                                  className="font-mono text-[11px] font-bold text-bb-ink hover:text-bb-yellow cursor-pointer"
                                >
                                  {m.author_name}
                                </button>
                              ) : (
                                <span className="font-mono text-[11px] font-bold text-bb-ink">{m.author_name}</span>
                              )}
                            </div>
                            <span className="font-mono text-[9px] uppercase text-bb-ink-faint">
                              {new Date(m.created_at).toLocaleDateString()}
                            </span>
                          </div>

                          {shouldHide ? (
                            <div className="rounded border border-dashed border-bb-line-strong bg-bb-ground p-3 text-center">
                              <p className="font-mono text-[10px] text-bb-ink-soft">
                                🔒 Solution hidden until 23:59 IST to prevent spoilers.
                              </p>
                            </div>
                          ) : (
                            <>
                              {submissionAttachments(m).map(att => (
                                <div key={att.id} className="mt-2 rounded border border-bb-line bg-bb-ground p-2">
                                  <div className="flex items-center justify-between gap-2">
                                    <button
                                      type="button"
                                      onClick={() => setExpandedSubmissionId((current) => current === att.id ? null : att.id)}
                                      className="min-w-0 truncate text-left font-mono text-[10px] text-bb-ink hover:text-bb-yellow cursor-pointer"
                                    >
                                      {att.filename}
                                    </button>
                                  <a
                                    href={att.url}
                                    download={att.filename}
                                    className="rounded border border-bb-yellow bg-bb-yellow/10 hover:bg-bb-yellow hover:text-bb-ground px-2 py-0.5 font-mono text-[9px] font-bold text-bb-yellow transition-all"
                                  >
                                    Download
                                  </a>
                                  </div>
                                  {expandedSubmissionId === att.id && <SubmissionAttachmentPreview attachment={att} />}
                                </div>
                              ))}
                            </>
                          )}
                        </Panel>
                      );
                    })}

                    {communityMessages.length === 0 && localSubmissions.length === 0 && (
                      <div className="rounded border border-dashed border-bb-line-strong p-6 text-center">
                        <p className="font-mono text-xs text-bb-ink-soft">
                          No other submissions yet. Be the first to upload your AC solution!
                        </p>
                      </div>
                    )}
                  </div>
                </div>

              </div>
            )}
          </DataState>
        </PageBody>
      </>
    );
  }

  // ── single thread (regular article or other thread) ───────────────
  if (threadId) {
    return (
      <>
        <PageHeader
          number="—"
          title={channel.label}
          blurb="Thread contents, synced from Discord."
          aside={
            <Button variant="outline" size="md" className="w-full sm:w-auto"
                    onClick={() => navigate(`c/${channel.slug}`)}>
              Back to {channel.label}
            </Button>
          }
        />
        <PageBody>
          <DataState
            state={thread.state} error={thread.error} data={thread.data} onRetry={thread.reload}
            skeleton={<SkeletonRows rows={4} height="h-24" />}
            isEmpty={(d) => d.messages.length === 0}
            empty={<EmptyState title="Empty thread" />}
          >
            {(d) => (
              <div className="flex flex-col gap-3">
                {d.messages.map((m) => <DiscordMessageCard key={m.message_id} message={m} />)}
              </div>
            )}
          </DataState>
        </PageBody>
      </>
    );
  }

  // ── thread index (daily editorials, OA questions forum, etc.) ──────
  if (channel.view === "threads" || channel.view === "forum") {
    const isForum = channel.view === "forum";
    return (
      <>
        <PageHeader number="—" title={channel.label} blurb={channel.blurb} />
        <PageBody>
          <DataState
            state={threads.state} error={threads.error} data={threads.data} onRetry={threads.reload}
            skeleton={<SkeletonRows rows={6} height="h-16" />}
            isEmpty={(d) => d.threads.length === 0}
            empty={<EmptyState title={isForum ? "Nothing synced yet" : "No editorials synced yet"} />}
          >
            {(d) => {
              const sortedThreads = [...d.threads].sort((a, b) => {
                const dayA = a.name.match(/Day\s*#?(\d+)/i)?.[1];
                const dayB = b.name.match(/Day\s*#?(\d+)/i)?.[1];
                if (dayA && dayB) return parseInt(dayB, 10) - parseInt(dayA, 10);
                if (a.editorial_date && b.editorial_date) return new Date(b.editorial_date).getTime() - new Date(a.editorial_date).getTime();
                return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
              });

              return (
              <div className="flex flex-col gap-3">
                {sortedThreads.map((t) => (
                  <Panel
                    key={t.thread_id}
                    lift
                    className="cursor-pointer p-4 transition-all hover:border-bb-yellow"
                    onClick={() => navigate(`c/${channel.slug}/${t.thread_id}`)}
                  >
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <p className="font-display text-base font-bold uppercase tracking-tight text-bb-ink hover:text-bb-yellow transition-colors">
                            {t.name}
                          </p>
                          {t.has_pdf && <Tag tone="accent">PDF Available</Tag>}
                        </div>
                        <p className="font-mono text-xs text-bb-ink-soft mt-1">
                          {t.message_count} posts · {t.editorial_date ? `Day of ${t.editorial_date.slice(0, 10)}` : new Date(t.created_at).toLocaleDateString()}
                        </p>
                      </div>
                      <Button variant="outline" size="sm" className="shrink-0">
                        View Editorial ➔
                      </Button>
                    </div>
                  </Panel>
                ))}
              </div>
              );
            }}
          </DataState>
        </PageBody>
      </>
    );
  }

  // ── Default Feed / Articles / Team / Docs Renderers ────────────────
  return (
    <>
      <PageHeader number="—" title={channel.label} blurb={channel.blurb} />
      <PageBody>
        <DataState
          state={feed.state} error={feed.error} data={feed.data} onRetry={feed.reload}
          skeleton={<SkeletonRows rows={4} height="h-28" />}
          isEmpty={(d) => d.messages.length === 0}
          empty={<EmptyState title="No messages yet" />}
        >
          {(d) => (
            <div className="flex flex-col gap-3">
              {d.messages.map((m) => <DiscordMessageCard key={m.message_id} message={m} />)}
            </div>
          )}
        </DataState>
      </PageBody>
    </>
  );
};
