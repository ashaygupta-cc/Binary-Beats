import React, { useMemo, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { buildDuelTargets, buildSoloTargets } from "../../lib/blitzAlgorithm";
import { CfApiError, fetchUserInfo, isValidHandleFormat, type CfUser } from "../../lib/codeforces";
import type { BlitzMode } from "../../lib/blitzSession";
import { RatingBadge } from "../ui/RatingBadge";
import { Panel } from "../ui/Panel";
import { Eyebrow } from "../ui/Eyebrow";
import { Tag } from "../ui/Tag";
import { Button } from "../ui/Button";
import { Divider } from "../ui/Divider";

export interface RivalInfo {
  handle: string;
  rating: number | null;
}

interface SessionSetupProps {
  meHandle: string;
  meRating: number | null;
  starting: boolean;
  startError: string | null;
  playSound: (type: "click" | "hover") => void;
  onStart: (mode: BlitzMode, rival: RivalInfo | null, totalGames: number) => void;
}

const PIPELINE_STEPS = [
  { text: "Solve on codeforces.com using your linked handle.", meta: null },
  { text: "Accepted verdicts are detected automatically.", meta: "~15s poll · codeforces api" },
  { text: "Only submissions made after the draw count.", meta: "timestamp-gated" },
  { text: "Problems either of you already solved are excluded.", meta: "dedup vs. solve history" },
];

export const SessionSetup: React.FC<SessionSetupProps> = ({
  meHandle,
  meRating,
  starting,
  startError,
  playSound,
  onStart,
}) => {
  const [family, setFamily] = useState<"dsa" | "cp" | "icpc">("dsa");
  const [format, setFormat] = useState<"blitz" | "duel">("blitz");
  const [numProblems, setNumProblems] = useState<2 | 3>(3);
  const [rivalInput, setRivalInput] = useState("");
  const [rival, setRival] = useState<CfUser | null>(null);
  const [rivalStatus, setRivalStatus] = useState<"idle" | "validating" | "error">("idle");
  const [rivalError, setRivalError] = useState<string | null>(null);

  const mode = `${family}_${format}` as BlitzMode;

  const fetchRival = async () => {
    const trimmed = rivalInput.trim();
    if (!isValidHandleFormat(trimmed)) {
      setRivalStatus("error");
      setRivalError("Enter a valid handle.");
      return;
    }
    if (trimmed.toLowerCase() === meHandle.toLowerCase()) {
      setRivalStatus("error");
      setRivalError("Pick someone other than yourself to duel.");
      return;
    }

    setRivalStatus("validating");
    setRivalError(null);
    playSound("click");

    try {
      const [fetched] = await fetchUserInfo([trimmed]);
      if (!fetched) {
        setRivalStatus("error");
        setRivalError(`No user "${trimmed}" found.`);
        return;
      }
      setRival(fetched);
      setRivalStatus("idle");
    } catch (e) {
      setRivalStatus("error");
      setRivalError(
        e instanceof CfApiError && e.kind === "NOT_FOUND"
          ? `No user "${trimmed}" found.`
          : "Could not reach verification server. Retry in a moment."
      );
    }
  };

  const targets = useMemo(() => {
    if (family === "dsa") return null;
    if (format === "blitz") return buildSoloTargets(meRating ?? 800);
    if (rival) return buildDuelTargets(meRating ?? 800, rival.rating ?? 800);
    return null;
  }, [family, format, meRating, rival]);

  const canStart = true;

  const handleStart = () => {
    if (starting) return;
    playSound("click");
    const targetRival = format === "duel"
      ? (rival ? { handle: rival.handle, rating: rival.rating ?? null } : { handle: "Z4s", rating: 1200 })
      : null;
    onStart(mode, targetRival, numProblems);
  };

  const pipelineSteps = [
    {
      text: family === "dsa" ? "Solve on leetcode.com using your linked handle." : "Solve on codeforces.com using your linked handle.",
      meta: null,
    },
    {
      text: "Accepted verdicts are detected automatically.",
      meta: family === "dsa" ? "LeetCode GraphQL API" : "~15s poll · Codeforces API",
    },
    { text: "Only submissions made after the match start count.", meta: "timestamp-gated" },
    { text: "Problems either of you already solved are excluded.", meta: "dedup vs. solve history" },
  ];

  return (
    <div className="flex flex-col gap-6">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <Eyebrow>{meHandle} is linked</Eyebrow>
        <h3 className="font-display font-extrabold text-3xl text-bb-ink mt-3">Ready to compete?</h3>
        <p className="text-sm text-bb-ink/55 mt-1.5">Pick a mode and we'll draw a rating-matched problem set.</p>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2">
          <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
            <Panel bracket className="p-6">
              <h4>
                <Eyebrow className="border-b border-bb-line pb-2.5 mb-4 block">1. Select Problem Family</Eyebrow>
              </h4>
              <div className="grid grid-cols-3 gap-3 mb-6">
                {[
                  { id: "dsa", label: "DSA (LeetCode)", desc: "Easy / Med / Hard sequence" },
                  { id: "cp", label: "CP (Codeforces)", desc: "Rating ladder sequence" },
                  { id: "icpc", label: "ICPC Mode", desc: "Harder rating targets" },
                ].map((f) => {
                  const selected = family === f.id;
                  return (
                    <button
                      key={f.id}
                      onClick={() => {
                        playSound("click");
                        setFamily(f.id as "dsa" | "cp" | "icpc");
                      }}
                      className={`relative p-3.5 text-left rounded border transition-colors cursor-pointer ${
                        selected ? "border-bb-yellow bg-bb-yellow/[0.08]" : "border-bb-line hover:border-bb-ink/30"
                      }`}
                    >
                      {selected && <span className="absolute top-2 right-2 text-bb-yellow text-xs font-bold font-mono">✓</span>}
                      <span className="text-xs font-bold font-display text-bb-ink block mb-0.5">{f.label}</span>
                      <span className="text-[10px] font-mono text-bb-ink/45 block">{f.desc}</span>
                    </button>
                  );
                })}
              </div>

              <h4>
                <Eyebrow className="border-b border-bb-line pb-2.5 mb-4 block">2. Choose Match Format</Eyebrow>
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
                {(["blitz", "duel"] as const).map((m) => {
                  const selected = format === m;
                  return (
                    <button
                      key={m}
                      onClick={() => {
                        playSound("click");
                        setFormat(m);
                      }}
                      onMouseEnter={() => playSound("hover")}
                      className={`relative text-left rounded border p-5 transition-colors cursor-pointer ${
                        selected ? "border-bb-yellow bg-bb-yellow/[0.08]" : "border-bb-line hover:border-bb-ink/30"
                      }`}
                    >
                      {selected && <span className="absolute top-3 right-3 text-bb-yellow text-sm font-bold font-mono">✓</span>}
                      <span className="text-base font-bold font-display text-bb-ink block mb-1">
                        {m === "blitz" ? "Solo Blitz" : "1v1 Duel"}
                      </span>
                      <span className="text-xs font-mono text-bb-ink/45 leading-relaxed block">
                        {m === "blitz"
                          ? "Fast fingers · Shared problems & timer"
                          : "ICPC-style contest · Auto-bot or 1v1 rival"}
                      </span>
                    </button>
                  );
                })}
              </div>

              <h4>
                <Eyebrow className="border-b border-bb-line pb-2.5 mb-4 block">3. Select Question Format</Eyebrow>
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
                {[
                  { num: 2, label: "2-Question Format", desc: "Fast Match · Medium + Medium / Easy + Hard" },
                  { num: 3, label: "3-Question Format", desc: "Standard Match · Easy + Medium + Hard (Default)" },
                ].map((q) => {
                  const selected = numProblems === q.num;
                  return (
                    <button
                      key={q.num}
                      onClick={() => {
                        playSound("click");
                        setNumProblems(q.num as 2 | 3);
                      }}
                      className={`relative p-4 text-left rounded border transition-colors cursor-pointer ${
                        selected ? "border-bb-yellow bg-bb-yellow/[0.08]" : "border-bb-line hover:border-bb-ink/30"
                      }`}
                    >
                      {selected && <span className="absolute top-3 right-3 text-bb-yellow text-sm font-bold font-mono">✓</span>}
                      <span className="text-sm font-bold font-display text-bb-ink block mb-0.5">{q.label}</span>
                      <span className="text-xs font-mono text-bb-ink/45 block">{q.desc}</span>
                    </button>
                  );
                })}
              </div>

              <AnimatePresence>
                {format === "duel" && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="mt-5 pt-5 border-t border-bb-line">
                      <p className="text-xs font-mono text-bb-ink/45 mb-3">
                        Leave blank for auto-bot matchmaking 🤖 or enter any Codeforces handle to duel a friend.
                      </p>
                      {rival ? (
                        <motion.div
                          initial={{ opacity: 0, scale: 0.97 }}
                          animate={{ opacity: 1, scale: 1 }}
                          className="relative rounded border-[1.5px] border-bb-line bg-bb-ground/40 p-5"
                        >
                          <button
                            onClick={() => {
                              setRival(null);
                              setRivalInput("");
                            }}
                            className="absolute top-3 right-3 text-[9px] font-mono uppercase tracking-wider text-bb-ink/40 hover:text-bb-yellow transition-colors cursor-pointer"
                          >
                            change
                          </button>

                          <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2 sm:gap-6">
                            {/* Me */}
                            <div className="flex flex-col items-center text-center gap-2 min-w-0">
                              <div className="w-12 h-12 rounded-full bg-bb-ground border border-bb-yellow/40 text-bb-yellow flex items-center justify-center text-base font-bold font-mono shrink-0">
                                {meHandle[0].toUpperCase()}
                              </div>
                              <span className="text-xs font-bold text-bb-ink truncate max-w-full">{meHandle}</span>
                              <RatingBadge rating={meRating} />
                            </div>

                            {/* VS */}
                            <div className="flex flex-col items-center gap-1 px-1">
                              <span className="font-display font-black text-2xl sm:text-3xl text-bb-ink leading-none">
                                VS
                              </span>
                              <span className="text-[9px] font-mono uppercase tracking-wider text-bb-ink/35">
                                Duel
                              </span>
                            </div>

                            {/* Rival */}
                            <div className="flex flex-col items-center text-center gap-2 min-w-0">
                              <div className="w-12 h-12 rounded-full bg-bb-ground border border-bb-rival/40 text-bb-rival flex items-center justify-center text-base font-bold font-mono shrink-0">
                                {rival.handle[0].toUpperCase()}
                              </div>
                              <span className="text-xs font-bold text-bb-ink truncate max-w-full">
                                {rival.handle}
                              </span>
                              <RatingBadge rating={rival.rating ?? null} />
                            </div>
                          </div>
                        </motion.div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <input
                            value={rivalInput}
                            onChange={(e) => setRivalInput(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") fetchRival();
                            }}
                            placeholder="rival's codeforces handle"
                            disabled={rivalStatus === "validating"}
                            className="flex-1 h-9 px-3 rounded text-xs font-mono text-bb-ink bg-bb-ground placeholder-bb-ink/30 focus:outline-none border-[1.5px] border-bb-line focus:border-bb-line-strong transition-colors disabled:opacity-50"
                          />
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={fetchRival}
                            disabled={rivalStatus === "validating"}
                            className="shrink-0"
                          >
                            {rivalStatus === "validating" ? "Checking…" : "Fetch"}
                          </Button>
                        </div>
                      )}
                      {rivalError && <p className="text-xs font-mono text-bb-danger mt-2">{rivalError}</p>}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              <div className="mt-5">
                <Divider variant="dashed" className="mb-5" />
                <Eyebrow className="block mb-2.5">Target draw</Eyebrow>
                <div className="flex flex-wrap gap-2 mb-2.5">
                  {family === "dsa" ? (
                    <>
                      <Tag tone="accent">Easy</Tag>
                      <Tag tone="warn">Medium</Tag>
                      <Tag tone="warn">Medium</Tag>
                      <Tag tone="danger">Hard</Tag>
                    </>
                  ) : targets ? (
                    targets.map((t, i) => <RatingBadge key={i} rating={t} />)
                  ) : (
                    <Tag tone="neutral">Standard rating ladder</Tag>
                  )}
                </div>
                <p className="text-[11px] font-mono text-bb-ink/40 leading-relaxed">
                  {family === "dsa"
                    ? "Easy → Medium → Medium → Hard sequence drawn from LeetCode problem pool."
                    : format === "blitz"
                    ? "Staircase from just-below your rating up to a stretch problem."
                    : "Anchored 60/40 toward the lower rating, capped so the gap never dominates."}
                </p>
              </div>

              <Button
                variant="primary"
                size="md"
                onClick={handleStart}
                onMouseEnter={() => canStart && playSound("hover")}
                disabled={!canStart || starting}
                className="w-full mt-6"
              >
                {starting ? "Drawing problems…" : "Start Session"}
              </Button>
              {startError && <p className="text-xs font-mono text-bb-danger mt-3 text-center">{startError}</p>}
            </Panel>
          </motion.div>
        </div>

        <div className="flex flex-col gap-6">
          <motion.div initial={{ opacity: 0, x: 15 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.1 }}>
            <Panel className="p-6">
              <div className="flex items-center justify-between mb-5 border-b border-bb-line pb-2.5">
                <Eyebrow>Detection Pipeline</Eyebrow>
                <span className="flex items-center gap-1.5 text-[9px] font-mono text-bb-yellow uppercase tracking-wider">
                  <span className="relative flex w-1.5 h-1.5">
                    <span className="absolute inset-0 rounded-full bg-bb-yellow animate-pulse-accent" />
                    <span className="absolute -inset-1 rounded-full border border-bb-yellow/50 animate-ping" />
                  </span>
                  live
                </span>
              </div>

              <div className="relative pl-1">
                <div
                  aria-hidden
                  className="absolute left-[14px] top-3 bottom-3 w-px"
                  style={{ backgroundImage: "repeating-linear-gradient(to bottom, var(--bb-line) 0 3px, transparent 3px 7px)" }}
                />
                {pipelineSteps.map((step, i, arr) => (
                  <div key={i} className={`relative flex gap-3 ${i < arr.length - 1 ? "pb-5" : ""}`}>
                    <div className="relative z-10 w-7 h-7 rounded-full border border-bb-line bg-bb-ground flex items-center justify-center shrink-0 font-mono text-[10px] font-bold text-bb-yellow">
                      {String(i + 1).padStart(2, "0")}
                    </div>
                    <div className="pt-0.5 min-w-0">
                      <p className="text-sm text-bb-ink/65 leading-snug">{step.text}</p>
                      {step.meta && (
                        <Tag tone="neutral" className="mt-1.5">
                          {step.meta}
                        </Tag>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </Panel>
          </motion.div>
        </div>
      </div>
    </div>
  );
};
