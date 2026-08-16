import { useEffect, useMemo, useRef, useState } from "react";
import { motion } from "motion/react";
import type { Problem } from "../hooks/useProblems";
import { fetchOrbitProblems, ORBIT_RINGS } from "../lib/orbitData";
import { colorForRating, difficultyLabel } from "./ui/RatingBadge";
import { Panel } from "./ui/Panel";
import { Tag } from "./ui/Tag";
import { Button } from "./ui/Button";
import { Eyebrow } from "./ui/Eyebrow";
import { StatNumeral } from "./ui/StatNumeral";

interface ProblemOrbitProps {
  solvedKeys: string[];
  onOpen: (key: string) => void;
  playSound: (t: "click" | "hover") => void;
}

interface OrbitNode {
  problem: Problem;
  baseX: number;
  baseY: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  phase: number;
  floatAmp: number;
  floatSpeed: number;
  r: number;
}

interface CameraAnim {
  active: boolean;
  fromX: number;
  fromY: number;
  fromZoom: number;
  toX: number;
  toY: number;
  toZoom: number;
  start: number;
  duration: number;
}

type Pulse =
  | { kind: "point"; x: number; y: number; start: number }
  | { kind: "ring"; radius: number; start: number };

const RING_INNER = 70;
const RING_WIDTH = 78;
const NODE_R = 4.2;
const SPRING_K = 22;
const DAMPING = 0.9;
const REPEL_RADIUS = 46;
const REPEL_STRENGTH = 1600;
const ZOOM_MIN = 0.45;
const ZOOM_MAX = 2.6;
const DEFAULT_ZOOM = 0.62;
const DRAG_THRESHOLD = 5;

function hashStr(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (Math.imul(h, 31) + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

/** Thin wrapper around the shared rating->difficulty thresholds (ui/RatingBadge)
 *  so this file doesn't re-hardcode the same Easy/Medium/Hard cutoffs a
 *  second time — only adds the "Unrated" case, which is orbit-specific. */
function diffLabel(r: number | null): "Unrated" | "Easy" | "Medium" | "Hard" {
  return r == null ? "Unrated" : difficultyLabel(r);
}

/** Difficulty color now comes from the same Codeforces rating->color mapping
 *  RatingBadge/ProblemCard/SolveSidebar all use, instead of a bespoke
 *  success/yellow/danger 3-step ramp — that ramp used to collide with real
 *  status colors (a "Hard" tile and a WA verdict could both read red). */
function tierColor(rating: number | null, palette: Palette): string {
  return rating == null ? palette.inkFaint : colorForRating(rating);
}

interface Palette {
  ground: string;
  ink: string;
  inkFaint: string;
  line: string;
  lineStrong: string;
  yellow: string;
  success: string;
}

function readPalette(): Palette {
  const s = getComputedStyle(document.documentElement);
  const g = (name: string, fallback: string) => s.getPropertyValue(name).trim() || fallback;
  return {
    ground: g("--bb-ground", "#0B0C0E"),
    ink: g("--bb-ink", "#F2F2ED"),
    inkFaint: g("--bb-ink-faint", "#75786F"),
    line: g("--bb-line", "rgba(242,242,237,0.14)"),
    lineStrong: g("--bb-line-strong", "rgba(242,242,237,0.30)"),
    yellow: g("--bb-yellow", "#FFD400"),
    success: g("--bb-success", "#35D46A"),
  };
}

function ringRadius(index: number): number {
  return RING_INNER + index * RING_WIDTH;
}

function ringIndexForRating(rating: number | null): number {
  for (let i = 0; i < ORBIT_RINGS.length; i++) {
    if ((rating ?? 0) <= ORBIT_RINGS[i].max) return i;
  }
  return ORBIT_RINGS.length - 1;
}

function clampZoom(z: number): number {
  return Math.max(ZOOM_MIN, Math.min(ZOOM_MAX, z));
}

function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}

/** Square path centered at (cx, cy) with half-side `half` — the one node/
 *  ring/pulse shape for the whole board now (tiles + rectangular tier
 *  bands), replacing the old circles/rings. */
function squarePath(ctx: CanvasRenderingContext2D, cx: number, cy: number, half: number) {
  ctx.beginPath();
  ctx.rect(cx - half, cy - half, half * 2, half * 2);
}

export const ProblemOrbit: React.FC<ProblemOrbitProps> = ({ solvedKeys, onOpen, playSound }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const nodesRef = useRef<OrbitNode[]>([]);
  const cameraRef = useRef({ x: 0, y: 0, zoom: DEFAULT_ZOOM });
  const cameraAnimRef = useRef<CameraAnim>({
    active: false, fromX: 0, fromY: 0, fromZoom: DEFAULT_ZOOM,
    toX: 0, toY: 0, toZoom: DEFAULT_ZOOM, start: 0, duration: 650,
  });
  const pulseRef = useRef<Pulse | null>(null);
  const mouseScreenRef = useRef({ x: -9999, y: -9999 });
  const mouseWorldRef = useRef({ x: -9999, y: -9999 });
  const dragRef = useRef({ down: false, dragging: false, startX: 0, startY: 0, camX: 0, camY: 0 });
  const solvedSetRef = useRef(new Set(solvedKeys));
  const hoveredRef = useRef<OrbitNode | null>(null);
  const sizeRef = useRef({ w: 0, h: 0 });
  const matchedKeysRef = useRef<Set<string>>(new Set());
  const anyFilterActiveRef = useRef(false);
  const ringStatsRef = useRef<{ solved: number; total: number }[]>([]);

  const [problems, setProblems] = useState<Problem[] | null>(null);
  const [hovered, setHovered] = useState<Problem | null>(null);
  const [search, setSearch] = useState("");
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [diffFilter, setDiffFilter] = useState<"" | "easy" | "medium" | "hard">("");

  useEffect(() => {
    solvedSetRef.current = new Set(solvedKeys);
  }, [solvedKeys]);

  useEffect(() => {
    let cancelled = false;
    fetchOrbitProblems().then((p) => {
      if (!cancelled) setProblems(p);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const nextUpKey = useMemo(() => {
    if (!problems) return null;
    return problems.find((p) => !solvedKeys.includes(p.key))?.key ?? null;
  }, [problems, solvedKeys]);

  const nextUpProblem = useMemo(
    () => problems?.find((p) => p.key === nextUpKey) ?? null,
    [problems, nextUpKey]
  );

  // Top tags in the loaded sample — a data-driven filter shortcut instead of
  // a hardcoded list, so it stays honest about what's actually navigable here.
  const topTags = useMemo(() => {
    if (!problems) return [];
    const counts = new Map<string, number>();
    for (const p of problems) for (const t of p.tags) counts.set(t, (counts.get(t) ?? 0) + 1);
    return [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 10).map(([t]) => t);
  }, [problems]);

  const filteredProblems = useMemo(() => {
    if (!problems) return [];
    const s = search.trim().toLowerCase();
    return problems.filter((p) => {
      if (diffFilter && diffLabel(p.rating).toLowerCase() !== diffFilter) return false;
      if (selectedTag && !p.tags.includes(selectedTag)) return false;
      if (s) {
        const hay = `${p.title ?? ""} ${p.key} ${p.tags.join(" ")} ${p.contestId}${p.index}`.toLowerCase();
        if (!hay.includes(s)) return false;
      }
      return true;
    });
  }, [problems, search, selectedTag, diffFilter]);

  const anyFilterActive = Boolean(search.trim() || selectedTag || diffFilter);

  const matchedKeys = useMemo(
    () => new Set(filteredProblems.map((p) => p.key)),
    [filteredProblems]
  );

  useEffect(() => {
    matchedKeysRef.current = matchedKeys;
    anyFilterActiveRef.current = anyFilterActive;
  }, [matchedKeys, anyFilterActive]);

  // Per-ring solved/mapped counts — feeds both the on-canvas ring labels and
  // the side panel's ring list, computed once instead of per animation frame.
  const ringStats = useMemo(() => {
    const stats = ORBIT_RINGS.map(() => ({ solved: 0, total: 0 }));
    if (!problems) return stats;
    const solved = new Set(solvedKeys);
    for (const p of problems) {
      const idx = ringIndexForRating(p.rating);
      stats[idx].total++;
      if (solved.has(p.key)) stats[idx].solved++;
    }
    return stats;
  }, [problems, solvedKeys]);

  useEffect(() => {
    ringStatsRef.current = ringStats;
  }, [ringStats]);

  const totalSolved = useMemo(() => ringStats.reduce((a, r) => a + r.solved, 0), [ringStats]);

  // Build the static orbital layout once problems arrive: radius encodes
  // rating (your progression outward from center), angle clusters by topic
  // (a stable hash of the primary tag), with jitter so a topic reads as a
  // loose constellation rather than a single spoke. The layout math stays
  // polar/circular — only how each point is *drawn* (square tiles, square
  // tier bands) changed for the brutalist reshape.
  useEffect(() => {
    if (!problems) return;
    nodesRef.current = problems.map((p) => {
      const ringIdx = ringIndexForRating(p.rating);
      const ring = ORBIT_RINGS[ringIdx];
      const t = Math.max(0, Math.min(1, ((p.rating ?? ring.min) - ring.min) / (ring.max - ring.min || 1)));
      const radius = ringRadius(ringIdx) + t * RING_WIDTH * 0.82 + RING_WIDTH * 0.09;

      const tag = p.tags[0] ?? "misc";
      const baseAngle = (hashStr(tag) % 3600) / 3600 * Math.PI * 2;
      const jitter = ((hashStr(p.key) % 1000) / 1000 - 0.5) * (Math.PI / 5);
      const angle = baseAngle + jitter;

      const baseX = Math.cos(angle) * radius;
      const baseY = Math.sin(angle) * radius;
      const seed = hashStr(p.key + "seed");

      return {
        problem: p,
        baseX,
        baseY,
        x: baseX,
        y: baseY,
        vx: 0,
        vy: 0,
        phase: (seed % 628) / 100,
        floatAmp: 3 + (seed % 400) / 100,
        floatSpeed: 0.35 + (seed % 250) / 1000,
        r: NODE_R,
      };
    });
  }, [problems]);

  // Resize handling — canvas is DPR-scaled for crisp rendering at any zoom.
  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const resize = () => {
      const rect = container.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2.5);
      canvas.width = Math.round(rect.width * dpr);
      canvas.height = Math.round(rect.height * dpr);
      canvas.style.width = `${rect.width}px`;
      canvas.style.height = `${rect.height}px`;
      sizeRef.current = { w: rect.width, h: rect.height };
      const ctx = canvas.getContext("2d");
      if (ctx) ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(container);
    return () => ro.disconnect();
  }, []);

  // The animation loop — idle floating + mouse-repel spring physics, then a
  // full redraw every frame. Positions live in refs, never React state, so
  // this runs at display refresh rate without triggering re-renders. Filter
  // state also lives in refs (matchedKeysRef / anyFilterActiveRef) so typing
  // in the search box never has to tear down and rebuild this loop.
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let raf = 0;
    let last = performance.now();

    const tick = (now: number) => {
      raf = requestAnimationFrame(tick);
      const dt = Math.min(0.033, (now - last) / 1000);
      last = now;
      const t = now / 1000;
      const { w, h } = sizeRef.current;
      const cam = cameraRef.current;
      const mouseWorld = mouseWorldRef.current;
      const nodes = nodesRef.current;

      const anim = cameraAnimRef.current;
      if (anim.active) {
        const at = Math.min(1, (now - anim.start) / anim.duration);
        const e = easeOutCubic(at);
        cam.x = anim.fromX + (anim.toX - anim.fromX) * e;
        cam.y = anim.fromY + (anim.toY - anim.fromY) * e;
        cam.zoom = anim.fromZoom + (anim.toZoom - anim.fromZoom) * e;
        if (at >= 1) anim.active = false;
      }

      for (const n of nodes) {
        // The tile the user is currently hovering (as of last frame) freezes
        // in place entirely — no float, no spring, no repel — so it holds
        // still under the cursor long enough to actually click. Without this
        // lock, continuous idle floating means a static cursor loses the
        // node again within a couple hundred ms, which reads as "the board
        // dodges every click." Everything else keeps drifting normally.
        if (hoveredRef.current === n) {
          n.vx = 0;
          n.vy = 0;
          continue;
        }

        const floatX = Math.cos(t * n.floatSpeed + n.phase) * n.floatAmp;
        const floatY = Math.sin(t * n.floatSpeed * 1.3 + n.phase) * n.floatAmp;
        const targetX = n.baseX + floatX;
        const targetY = n.baseY + floatY;

        let ax = (targetX - n.x) * SPRING_K;
        let ay = (targetY - n.y) * SPRING_K;

        const dx = n.x - mouseWorld.x;
        const dy = n.y - mouseWorld.y;
        const dist = Math.hypot(dx, dy);
        if (dist < REPEL_RADIUS && dist > 0.001) {
          const force = (1 - dist / REPEL_RADIUS) * REPEL_STRENGTH;
          ax += (dx / dist) * force;
          ay += (dy / dist) * force;
        }

        n.vx = (n.vx + ax * dt) * DAMPING;
        n.vy = (n.vy + ay * dt) * DAMPING;
        n.x += n.vx * dt;
        n.y += n.vy * dt;
      }

      // ── Draw ──
      ctx.clearRect(0, 0, w, h);
      ctx.save();
      ctx.translate(w / 2 + cam.x, h / 2 + cam.y);
      ctx.scale(cam.zoom, cam.zoom);

      const pal = readPalette();

      // Tier bands + labels (label carries live solved/mapped counts per
      // band) — rectangular now, replacing the old dashed circles.
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      for (let i = 0; i < ORBIT_RINGS.length; i++) {
        const half = ringRadius(i) + RING_WIDTH;
        ctx.setLineDash([2, 6]);
        ctx.lineWidth = 1 / cam.zoom;
        ctx.strokeStyle = pal.lineStrong;
        squarePath(ctx, 0, 0, half);
        ctx.stroke();
        ctx.setLineDash([]);

        const rs = ringStatsRef.current[i];
        ctx.font = `700 ${11 / cam.zoom}px 'JetBrains Mono', monospace`;
        ctx.fillStyle = pal.inkFaint;
        ctx.fillText(
          `${ORBIT_RINGS[i].label.toUpperCase()} · ${ORBIT_RINGS[i].min}–${ORBIT_RINGS[i].max}${rs ? ` · ${rs.solved}/${rs.total}` : ""}`,
          0,
          -half + 12 / cam.zoom
        );
      }

      // Center "home" tile
      squarePath(ctx, 0, 0, 8 / cam.zoom);
      ctx.fillStyle = pal.ink;
      ctx.fill();
      squarePath(ctx, 0, 0, 13 / cam.zoom);
      ctx.strokeStyle = pal.lineStrong;
      ctx.lineWidth = 1 / cam.zoom;
      ctx.stroke();

      // Nodes — square tiles: solved fills success, next-up fills the
      // primary accent (CTA semantic), everything else outlines in its
      // rating color (never a status color, so a tile's color can't be
      // misread as a verdict).
      let hoveredNode: OrbitNode | null = null;
      const hitThreshold = 10 / cam.zoom;
      let closestDist = Infinity;
      const filterActive = anyFilterActiveRef.current;
      const matched = matchedKeysRef.current;

      for (const n of nodes) {
        const solved = solvedSetRef.current.has(n.problem.key);
        const isNext = n.problem.key === nextUpKey;
        const dx = n.x - mouseWorld.x;
        const dy = n.y - mouseWorld.y;
        const d = Math.hypot(dx, dy);
        const isHover = d < hitThreshold + n.r;
        if (isHover && d < closestDist) {
          closestDist = d;
          hoveredNode = n;
        }

        // A filter dims everything it doesn't match, so a search or tag
        // click reads as "these light up" rather than a silent no-op list.
        // Hover always wins over dimming — mousing over a faded tile still
        // reveals it, so filtering never hides information, only emphasis.
        if (filterActive && !matched.has(n.problem.key) && !isHover) {
          squarePath(ctx, n.x, n.y, n.r * 0.65);
          ctx.fillStyle = pal.ground;
          ctx.globalAlpha = 0.16;
          ctx.fill();
          ctx.lineWidth = 1 / cam.zoom;
          ctx.strokeStyle = pal.line;
          ctx.globalAlpha = 0.22;
          ctx.stroke();
          ctx.globalAlpha = 1;
          continue;
        }

        const color = solved ? pal.success : isNext ? pal.yellow : tierColor(n.problem.rating, pal);
        const half = isHover ? n.r * 1.7 : n.r;

        // Hover gets a small functional glow — a pragmatic exception, not
        // decoration: it's the one moment glow earns its keep, marking the
        // exact clickable target under the cursor. Idle solved/next-up
        // tiles get a crisp doubled-square outline instead, no blur.
        if (isHover) {
          ctx.save();
          ctx.shadowColor = color;
          ctx.shadowBlur = 12 / cam.zoom;
        }

        squarePath(ctx, n.x, n.y, half);
        ctx.fillStyle = solved || isNext ? color : pal.ground;
        ctx.globalAlpha = solved || isNext || isHover ? 1 : 0.85;
        ctx.fill();
        ctx.lineWidth = (isHover ? 2 : 1.3) / cam.zoom;
        ctx.strokeStyle = color;
        ctx.globalAlpha = 1;
        ctx.stroke();

        if (isHover) ctx.restore();

        if ((solved || isNext) && !isHover) {
          const outer = half + 3 / cam.zoom;
          squarePath(ctx, n.x, n.y, outer);
          ctx.lineWidth = 1 / cam.zoom;
          ctx.strokeStyle = color;
          ctx.globalAlpha = 0.5;
          ctx.stroke();
          ctx.globalAlpha = 1;
        }
      }

      // Pulse — a brief expanding square that marks where a search/focus
      // jump landed, so a camera fly-to reads as "here" instead of a silent
      // pan.
      const pulse = pulseRef.current;
      if (pulse) {
        const dur = pulse.kind === "ring" ? 900 : 1100;
        const elapsed = now - pulse.start;
        if (elapsed > dur) {
          pulseRef.current = null;
        } else {
          const pt = elapsed / dur;
          ctx.lineWidth = (pulse.kind === "ring" ? 2.5 : 2) / cam.zoom;
          ctx.strokeStyle = pal.yellow;
          ctx.globalAlpha = (1 - pt) * 0.9;
          if (pulse.kind === "ring") {
            squarePath(ctx, 0, 0, pulse.radius);
          } else {
            squarePath(ctx, pulse.x, pulse.y, 14 + pt * 46);
          }
          ctx.stroke();
          ctx.globalAlpha = 1;
        }
      }

      ctx.restore();

      if (hoveredNode !== hoveredRef.current) {
        hoveredRef.current = hoveredNode;
        setHovered(hoveredNode ? hoveredNode.problem : null);
      }

      if (tooltipRef.current) {
        const m = mouseScreenRef.current;
        tooltipRef.current.style.transform = `translate(${m.x + 16}px, ${m.y + 16}px)`;
      }
    };

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nextUpKey]);

  const toWorld = (sx: number, sy: number) => {
    const { w, h } = sizeRef.current;
    const cam = cameraRef.current;
    return { x: (sx - w / 2 - cam.x) / cam.zoom, y: (sy - h / 2 - cam.y) / cam.zoom };
  };

  // ── Camera choreography — search/tag/ring/"next up" all funnel through
  // these so a filter or click reads as "the board responds," not just a
  // list narrowing somewhere off-screen. ──
  const startCameraAnim = (toX: number, toY: number, toZoom: number, duration = 650) => {
    const cam = cameraRef.current;
    cameraAnimRef.current = {
      active: true,
      fromX: cam.x, fromY: cam.y, fromZoom: cam.zoom,
      toX, toY, toZoom, start: performance.now(), duration,
    };
  };

  const focusWorldPoint = (wx: number, wy: number, zoom: number) => {
    const z = clampZoom(zoom);
    startCameraAnim(-wx * z, -wy * z, z);
  };

  const focusBBox = (nodes: OrbitNode[], zoomCap = 1.8) => {
    if (nodes.length === 0) return;
    if (nodes.length === 1) {
      focusWorldPoint(nodes[0].baseX, nodes[0].baseY, Math.min(zoomCap, 1.5));
      pulseRef.current = { kind: "point", x: nodes[0].baseX, y: nodes[0].baseY, start: performance.now() };
      return;
    }
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    for (const n of nodes) {
      minX = Math.min(minX, n.baseX); maxX = Math.max(maxX, n.baseX);
      minY = Math.min(minY, n.baseY); maxY = Math.max(maxY, n.baseY);
    }
    const pad = 50;
    const cx = (minX + maxX) / 2, cy = (minY + maxY) / 2;
    const halfW = Math.max((maxX - minX) / 2 + pad, 40);
    const halfH = Math.max((maxY - minY) / 2 + pad, 40);
    const { w, h } = sizeRef.current;
    const margin = 70;
    const zoomX = (Math.max(w, 200) / 2 - margin) / halfW;
    const zoomY = (Math.max(h, 200) / 2 - margin) / halfH;
    focusWorldPoint(cx, cy, Math.min(zoomX, zoomY, zoomCap));
  };

  const focusRing = (i: number) => {
    playSound("click");
    const radius = ringRadius(i) + RING_WIDTH;
    const { w, h } = sizeRef.current;
    const margin = 60;
    const zoomX = (Math.max(w, 200) / 2 - margin) / radius;
    const zoomY = (Math.max(h, 200) / 2 - margin) / radius;
    focusWorldPoint(0, 0, Math.min(zoomX, zoomY));
    pulseRef.current = { kind: "ring", radius, start: performance.now() };
  };

  const focusNextUp = () => {
    playSound("hover");
    const node = nodesRef.current.find((n) => n.problem.key === nextUpKey);
    if (!node) return;
    focusWorldPoint(node.x, node.y, 1.5);
    pulseRef.current = { kind: "point", x: node.x, y: node.y, start: performance.now() };
  };

  const resetView = () => {
    playSound("click");
    startCameraAnim(0, 0, DEFAULT_ZOOM);
    pulseRef.current = null;
  };

  const clearFilters = () => {
    playSound("click");
    setSearch("");
    setSelectedTag(null);
    setDiffFilter("");
  };

  // Camera auto-fits to whatever currently matches the search/tag/difficulty
  // filters. Typing gets a short debounce so the view doesn't lurch on every
  // keystroke; a chip click (tag/difficulty) reacts immediately. Clearing
  // filters intentionally leaves the camera put — nothing is more jarring
  // than the view yanking away right as you finish reading it.
  useEffect(() => {
    if (!problems || !anyFilterActive) return;
    const delay = search.trim() ? 400 : 0;
    const id = setTimeout(() => {
      const keys = new Set(filteredProblems.map((p) => p.key));
      const matchNodes = nodesRef.current.filter((n) => keys.has(n.problem.key));
      focusBBox(matchNodes);
    }, delay);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, selectedTag, diffFilter, problems]);

  const handlePointerMove = (e: React.PointerEvent) => {
    const rect = containerRef.current!.getBoundingClientRect();
    const sx = e.clientX - rect.left;
    const sy = e.clientY - rect.top;
    mouseScreenRef.current = { x: sx, y: sy };
    mouseWorldRef.current = toWorld(sx, sy);

    if (dragRef.current.down) {
      const ddx = e.clientX - dragRef.current.startX;
      const ddy = e.clientY - dragRef.current.startY;
      if (!dragRef.current.dragging && Math.hypot(ddx, ddy) > DRAG_THRESHOLD) {
        dragRef.current.dragging = true;
      }
      if (dragRef.current.dragging) {
        cameraRef.current.x = dragRef.current.camX + ddx;
        cameraRef.current.y = dragRef.current.camY + ddy;
      }
    }
  };

  const handlePointerDown = (e: React.PointerEvent) => {
    (e.target as Element).setPointerCapture?.(e.pointerId);
    cameraAnimRef.current.active = false;
    dragRef.current = {
      down: true,
      dragging: false,
      startX: e.clientX,
      startY: e.clientY,
      camX: cameraRef.current.x,
      camY: cameraRef.current.y,
    };
  };

  const handlePointerUp = () => {
    const wasDragging = dragRef.current.dragging;
    dragRef.current.down = false;
    dragRef.current.dragging = false;
    if (!wasDragging && hoveredRef.current) {
      playSound("click");
      onOpen(hoveredRef.current.problem.key);
    }
  };

  // React attaches wheel listeners as passive by default, so a synthetic
  // onWheel handler can't actually block page scroll — preventDefault()
  // there just logs a warning and does nothing. A native listener with
  // { passive: false } is the only way to zoom without also scrolling
  // the page underneath the canvas.
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      cameraAnimRef.current.active = false;
      const rect = el.getBoundingClientRect();
      const sx = e.clientX - rect.left;
      const sy = e.clientY - rect.top;
      const before = toWorld(sx, sy);
      const cam = cameraRef.current;
      const factor = Math.exp(-e.deltaY * 0.0012);
      cam.zoom = Math.max(ZOOM_MIN, Math.min(ZOOM_MAX, cam.zoom * factor));
      const { w, h } = sizeRef.current;
      cam.x = sx - w / 2 - before.x * cam.zoom;
      cam.y = sy - h / 2 - before.y * cam.zoom;
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleMouseLeave = () => {
    mouseWorldRef.current = { x: -99999, y: -99999 };
  };

  const prevHoveredKey = useRef<string | null>(null);
  useEffect(() => {
    if (hovered && hovered.key !== prevHoveredKey.current) playSound("hover");
    prevHoveredKey.current = hovered?.key ?? null;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hovered]);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <Eyebrow>Rating Ladder · drag to pan · scroll to zoom · click a tile to solve</Eyebrow>
        {problems && (
          <span className="text-[10px] font-mono text-bb-ink-faint tabular-nums">
            {problems.length.toLocaleString()} problems mapped across the full rating range
          </span>
        )}
      </div>

      {/* Command bar — search + filters drive the same camera that drag/scroll do */}
      {problems && (
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative flex-1 min-w-[160px] max-w-[280px]">
            <svg className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-bb-ink-faint pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search & fly to a problem…"
              aria-label="Search problems"
              className="w-full h-8 pl-8 pr-3 rounded text-xs font-mono text-bb-ink placeholder-bb-ink-faint focus:outline-none bg-bb-surface border-[1.5px] border-bb-line focus:border-bb-line-strong transition-colors"
            />
          </div>

          <div className="flex rounded border border-bb-line bg-bb-surface p-0.5 font-mono text-[10px] gap-0.5">
            {(["", "easy", "medium", "hard"] as const).map((d) => (
              <button
                key={d}
                onClick={() => { playSound("click"); setDiffFilter(d); }}
                className={`px-2.5 h-7 rounded-sm font-bold cursor-pointer transition-colors ${diffFilter === d ? "bg-bb-yellow text-bb-ground" : "text-bb-ink-faint hover:text-bb-ink-soft"}`}
              >
                {d === "" ? "All" : d[0].toUpperCase() + d.slice(1)}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-1 overflow-x-auto no-scrollbar max-w-[380px]">
            {topTags.map((t) => (
              <button key={t} onClick={() => { playSound("click"); setSelectedTag(selectedTag === t ? null : t); }} className="shrink-0 cursor-pointer">
                <Tag tone={selectedTag === t ? "accent" : "neutral"}>#{t}</Tag>
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2 ml-auto shrink-0">
            {anyFilterActive && (
              <>
                <span className="text-[10px] font-mono text-bb-ink-faint tabular-nums">
                  {filteredProblems.length} match{filteredProblems.length === 1 ? "" : "es"}
                </span>
                <Button variant="outline" size="sm" onClick={clearFilters}>Clear</Button>
              </>
            )}
            <Button variant="outline" size="sm" onClick={resetView}>⊙ Recenter</Button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_248px] gap-3 items-start">
        <Panel
          bracket
          className="relative w-full h-[640px] text-bb-line-strong overflow-hidden select-none"
          style={{ cursor: hovered ? "pointer" : "grab" }}
          onPointerMove={handlePointerMove}
          onPointerDown={handlePointerDown}
          onPointerUp={handlePointerUp}
          onPointerLeave={handleMouseLeave}
        >
          <div ref={containerRef} className="absolute inset-0">
            <div className="absolute inset-0 scoreboard-grid pointer-events-none" />
            <canvas ref={canvasRef} className="absolute inset-0" />

            {!problems && (
              <div className="absolute inset-0 flex items-center justify-center">
                <motion.span
                  className="eyebrow-muted"
                  animate={{ opacity: [0.4, 1, 0.4] }}
                  transition={{ duration: 1.4, repeat: Infinity }}
                >
                  Charting the board…
                </motion.span>
              </div>
            )}

            {/* Legend */}
            <div className="absolute bottom-3 left-3 flex items-center gap-3 pointer-events-none">
              <span className="flex items-center gap-1.5 text-[9px] font-mono text-bb-ink-faint uppercase tracking-wider">
                <span className="w-2 h-2 rounded-sm bg-bb-success" /> Solved
              </span>
              <span className="flex items-center gap-1.5 text-[9px] font-mono text-bb-ink-faint uppercase tracking-wider">
                <span className="w-2 h-2 rounded-sm bg-bb-yellow" /> Next up
              </span>
              <span className="flex items-center gap-1.5 text-[9px] font-mono text-bb-ink-faint uppercase tracking-wider">
                <span className="w-2 h-2 rounded-sm border border-bb-line-strong bg-bb-ground" /> Unsolved
              </span>
            </div>

            {/* Cursor-following tooltip — positioned imperatively via ref for 60fps tracking */}
            <div
              ref={tooltipRef}
              className="absolute top-0 left-0 pointer-events-none z-20 transition-opacity duration-100"
              style={{ opacity: hovered ? 1 : 0, willChange: "transform" }}
            >
              {hovered && (
                <Panel className="px-3 py-2.5 max-w-[220px] shadow-sticker">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[9px] font-mono text-bb-ink-faint tabular-nums">
                      {hovered.contestId}{hovered.index}
                    </span>
                    {hovered.rating != null ? (
                      <span
                        className="inline-flex items-center rounded-sm border px-1.5 py-0.5 font-mono text-[8px] font-bold uppercase tracking-wider"
                        style={{ color: colorForRating(hovered.rating), borderColor: colorForRating(hovered.rating) }}
                      >
                        {diffLabel(hovered.rating)}
                      </span>
                    ) : (
                      <Tag tone="neutral">Unrated</Tag>
                    )}
                  </div>
                  <div className="text-xs font-bold text-bb-ink leading-snug mb-1">{hovered.title ?? hovered.key}</div>
                  <div className="flex items-center justify-between text-[10px] font-mono text-bb-ink-faint">
                    <span>{hovered.tags.slice(0, 2).join(" · ") || "misc"}</span>
                    <span className="tabular-nums">{hovered.rating ?? "—"}</span>
                  </div>
                </Panel>
              )}
            </div>
          </div>
        </Panel>

        {/* ── Control panel — the "useful" half: progress, a one-click path
            back to where you left off, and ring shortcuts that fly the
            camera instead of leaving navigation to blind drag/scroll. ── */}
        <div className="flex flex-col gap-3">
          <Panel bracket className="p-4">
            <Eyebrow className="mb-2">Progress</Eyebrow>
            <div className="flex items-baseline gap-1.5 mb-2">
              <StatNumeral value={totalSolved} size="md" countUp />
              <span className="text-xs font-mono text-bb-ink-faint">/ {problems?.length ?? 0} mapped</span>
            </div>
            <div className="h-1.5 rounded-sm bg-bb-ink/[0.08] overflow-hidden">
              <div
                className="h-full bg-bb-success rounded-sm transition-all duration-500"
                style={{ width: `${problems?.length ? (totalSolved / problems.length) * 100 : 0}%` }}
              />
            </div>
          </Panel>

          {nextUpProblem && (
            <Panel className="p-4">
              <div className="flex items-center justify-between mb-2">
                <Eyebrow>Next Up</Eyebrow>
                <span className="text-[10px] font-mono text-bb-ink-faint tabular-nums">
                  {nextUpProblem.contestId}{nextUpProblem.index}
                </span>
              </div>
              <div className="text-sm font-display font-bold text-bb-ink mb-2 leading-snug">
                {nextUpProblem.title ?? nextUpProblem.key}
              </div>
              <div className="flex items-center gap-1.5 mb-3 flex-wrap">
                {nextUpProblem.rating != null ? (
                  <span
                    className="inline-flex items-center rounded-sm border px-1.5 py-0.5 font-mono text-[9px] font-bold tabular-nums"
                    style={{ color: colorForRating(nextUpProblem.rating), borderColor: colorForRating(nextUpProblem.rating) }}
                  >
                    {nextUpProblem.rating}
                  </span>
                ) : (
                  <Tag tone="neutral">—</Tag>
                )}
                {nextUpProblem.tags[0] && <Tag tone="neutral">{nextUpProblem.tags[0]}</Tag>}
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" className="flex-1" onClick={focusNextUp}>Locate ◎</Button>
                <Button
                  variant="primary"
                  size="sm"
                  className="flex-1"
                  onClick={() => { playSound("click"); onOpen(nextUpProblem.key); }}
                >
                  Solve →
                </Button>
              </div>
            </Panel>
          )}

          <Panel className="p-4">
            <Eyebrow tone="muted" className="mb-3">Rings</Eyebrow>
            <div className="flex flex-col gap-2.5">
              {ORBIT_RINGS.map((ring, i) => {
                const rs = ringStats[i] ?? { solved: 0, total: 0 };
                const pct = rs.total ? (rs.solved / rs.total) * 100 : 0;
                return (
                  <button key={ring.label} onClick={() => focusRing(i)} className="w-full text-left cursor-pointer group">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[10px] font-mono font-bold text-bb-ink-soft group-hover:text-bb-yellow transition-colors uppercase tracking-wide">
                        {ring.label}
                      </span>
                      <span className="text-[9px] font-mono text-bb-ink-faint tabular-nums">{rs.solved}/{rs.total}</span>
                    </div>
                    <div className="h-1 rounded-sm bg-bb-ink/[0.08] overflow-hidden">
                      <div className="h-full bg-bb-yellow rounded-sm transition-all duration-500" style={{ width: `${pct}%` }} />
                    </div>
                  </button>
                );
              })}
            </div>
          </Panel>
        </div>
      </div>
    </div>
  );
};
