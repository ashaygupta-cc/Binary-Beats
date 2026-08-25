import { AnimatePresence, motion } from "motion/react";
import { Suspense, lazy, useCallback, useEffect, useState } from "react";
import { Footer } from "./components/Footer";
import { LeetCodeDashboard } from "./components/LeetCodeDashboard";
import { Navbar } from "./components/Navbar";

// Route-level code splitting
const BlitzDuelView = lazy(() =>
  import("./components/blitz/BlitzDuelView").then(m => ({ default: m.BlitzDuelView })));
const LeaderboardView = lazy(() =>
  import("./components/LeaderboardView").then(m => ({ default: m.LeaderboardView })));
const CommunityView = lazy(() =>
  import("./components/CommunityView").then(m => ({ default: m.CommunityView })));
const DailyProblemsPage = lazy(() =>
  import("./components/pages/DailyProblemsPage").then(m => ({ default: m.DailyProblemsPage })));
const LeaderboardsPage = lazy(() =>
  import("./components/pages/LeaderboardsPage").then(m => ({ default: m.LeaderboardsPage })));
const CommunityPage = lazy(() =>
  import("./components/pages/CommunityPage").then(m => ({ default: m.CommunityPage })));
const ProfilePage = lazy(() =>
  import("./components/pages/ProfilePage").then(m => ({ default: m.ProfilePage })));
const ChannelPage = lazy(() =>
  import("./components/pages/ChannelPage").then(m => ({ default: m.ChannelPage })));
// New pages
const CPDSAContentPage = lazy(() =>
  import("./components/pages/CPDSAContentPage").then(m => ({ default: m.CPDSAContentPage })));
const TeamPage = lazy(() =>
  import("./components/pages/TeamPage").then(m => ({ default: m.TeamPage })));
const AboutPage = lazy(() =>
  import("./components/pages/AboutPage").then(m => ({ default: m.AboutPage })));

import { Button } from "./components/ui/Button";
import { MemberGate } from "./components/ui/MemberGate";
import { EmptyState, PageBody, PageHeader, SkeletonRows } from "./components/ui/PageShell";
import { DISCORD_INVITE, navItem } from "./data/site";
import { useCfHandle } from "./hooks/useCfHandle";
import { useDiscordAuth } from "./hooks/useDiscordAuth";
import { ensureHash, navigate, useRoute } from "./lib/router";
import { synthSound } from "./utils/audio";

type Theme = "light" | "dark";

const BootLoader: React.FC<{ onComplete: () => void }> = ({ onComplete }) => {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const startedAt = performance.now();
    const duration = 1050;
    let frame = 0;

    const tick = (now: number) => {
      const elapsed = now - startedAt;
      const next = Math.min(100, Math.round((elapsed / duration) * 100));
      setProgress(next);
      if (next < 100) {
        frame = requestAnimationFrame(tick);
      } else {
        window.setTimeout(onComplete, 140);
      }
    };

    frame = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(frame);
    };
  }, [onComplete]);

  return (
    <motion.div
      className="fixed inset-0 z-[100] flex min-h-[100dvh] items-center justify-center overflow-hidden bg-bb-ground text-bb-ink"
      initial={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.35, ease: "easeInOut" }}
    >
      <div className="pointer-events-none absolute inset-0 scoreboard-grid opacity-80" />
      <div className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 select-none whitespace-nowrap font-display text-[clamp(6rem,22vw,20rem)] font-black leading-none text-bb-ink/[0.035]">
        BINARY BEATS
      </div>

      <div className="relative flex w-full max-w-3xl flex-col items-center px-6">
        <motion.div
          className="mb-7 h-px w-full bg-bb-line-strong"
          initial={{ scaleX: 0, opacity: 0 }}
          animate={{ scaleX: 1, opacity: 1 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
        />
        <motion.h1
          className="text-center font-display text-[clamp(3.5rem,11vw,8rem)] font-black uppercase leading-[0.82] tracking-tight"
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, ease: "easeOut" }}
        >
          <span className="text-bb-yellow">BINARY</span> BEATS
        </motion.h1>
        <div className="mt-9 flex w-full items-center gap-4 font-mono text-[11px] font-bold uppercase tracking-[0.18em] text-bb-yellow">
          <motion.span
            key={progress}
            className="tabular-nums"
            initial={{ opacity: 0.45, y: 2 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.08, ease: "linear" }}
          >
            {String(progress).padStart(2, "0")}&#37;
          </motion.span>
          <div className="h-1 flex-1 overflow-hidden bg-bb-line">
            <motion.div
              className="h-full origin-left bg-bb-yellow"
              animate={{ scaleX: progress / 100 }}
              transition={{ duration: 0.08, ease: "linear" }}
            />
          </div>
        </div>
        <motion.div
          className="mt-3 w-full text-right font-mono text-[9px] uppercase tracking-[0.22em] text-bb-ink-faint"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.25, duration: 0.3 }}
        >
          INITIALIZING
        </motion.div>
      </div>
    </motion.div>
  );
};

export default function App() {
  const { user, status: authStatus, gateReason, login, logout, refresh } = useDiscordAuth();
  const { user: cfUser } = useCfHandle();
  const route = useRoute();
  const page = route.page;

  const [soundEnabled] = useState(() => localStorage.getItem("bb_sound") !== "false");
  const [theme, setTheme] = useState<Theme>(() =>
    localStorage.getItem("bb_theme") === "light" ? "light" : "dark"
  );
  const [sharedCode, setSharedCode] = useState<{ problemTitle: string; code: string } | null>(null);
  const [booting, setBooting] = useState(true);

  useEffect(() => { ensureHash(); }, []);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem("bb_theme", theme);
  }, [theme]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (!params.has("auth")) return;
    if (params.get("auth") === "ok") refresh();
    window.history.replaceState({}, "", window.location.pathname);
  }, [refresh]);

  const playSound = (type: "click" | "hover") => {
    if (!soundEnabled) return;
    if (type === "click") synthSound.click();
    if (type === "hover") synthSound.hover();
  };

  const handleShareSolution = (details: { problemTitle: string; code: string }) => {
    setSharedCode(details);
    navigate("feed");
  };

  const displayName = user ? user.globalName ?? user.username : null;

  const gated = (feature: string, node: React.ReactNode) =>
    gateReason ? (
      <PageBody>
        <MemberGate
          feature={feature}
          reason={gateReason}
          inviteUrl={DISCORD_INVITE}
          onLogin={login}
          playSound={playSound}
        />
      </PageBody>
    ) : (
      node
    );

  const renderPage = () => {
    switch (page) {
      case "home":
        return (
          <LeetCodeDashboard
            playSound={playSound}
            onShareSolution={handleShareSolution}
            onNavigateTab={(tab: string) => navigate(tab === "community" ? "feed" : tab)}
          />
        );

      // New: CP/DSA Content panel (replaces standalone Daily Problems as primary)
      case "content":
        return (
          <CPDSAContentPage
            user={user}
            gateReason={gateReason}
            onLogin={login}
            playSound={playSound}
          />
        );

      // Legacy route — still accessible
      case "problems":
        return (
          <DailyProblemsPage
            user={user}
            gateReason={gateReason}
            onLogin={login}
            playSound={playSound}
          />
        );

      case "leaderboards":
        return (
          <LeaderboardsPage
            boardId={route.segments[1]}
            currentDiscordId={user?.id ?? null}
            playSound={playSound}
          />
        );

      case "community":
        return <CommunityPage playSound={playSound} />;

      // New: standalone Team page
      case "team":
        return <TeamPage playSound={playSound} />;

      // New: standalone About page
      case "about":
        return <AboutPage playSound={playSound} />;

      case "feed":
        return gated(
          "Community Feed",
          <CommunityView
            playSound={playSound}
            sharedCode={sharedCode}
            onClearSharedCode={() => setSharedCode(null)}
          />
        );

      case "blitz":
      case "arena":
        return gated("Arena", <BlitzDuelView playSound={playSound} />);

      case "ranking":
        return gated(
          "Session Ranking",
          <LeaderboardView playSound={playSound} currentUser={displayName ?? ""} />
        );

      case "c": {
        const slug = route.segments[1];
        if (!slug) return <CommunityPage playSound={playSound} />;
        return <ChannelPage slug={slug} threadId={route.segments[2]} playSound={playSound} user={user} />;
      }

      case "u": {
        const id = route.segments[1];
        if (!id) {
          return (
            <PageBody>
              <EmptyState title="No member selected" body="Open a profile from any leaderboard." />
            </PageBody>
          );
        }
        return <ProfilePage discordId={id} isSelf={id === user?.id} playSound={playSound} />;
      }

      default:
        return (
          <>
            <PageHeader number="404" title="Page not found" blurb={`Nothing routes to "${page}".`} />
            <PageBody>
              <EmptyState
                title="Dead link"
                body="This route doesn't exist yet — it may be shipping in a later phase."
                action={
                  <Button variant="primary" size="md" onClick={() => navigate("")}>
                    Back home
                  </Button>
                }
              />
            </PageBody>
          </>
        );
    }
  };

  useEffect(() => {
    const item = navItem(page);
    document.title = page === "home"
      ? "Binary Beats"
      : item ? `${item.label} · Binary Beats` : "Binary Beats";
  }, [page]);

  const completeBoot = useCallback(() => setBooting(false), []);

  return (
    <div className="relative flex min-h-[100dvh] w-full flex-col overflow-x-hidden bg-bb-ground font-sans text-bb-ink">
      <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
        <div className="scoreboard-grid absolute inset-0" />
      </div>

      <Navbar
        activeTab={page}
        rating={cfUser?.rating ?? null}
        username={displayName}
        avatarUrl={user?.avatarUrl ?? null}
        isMember={user?.isMember ?? false}
        authStatus={authStatus}
        discordId={user?.id ?? null}
        onLogin={() => { playSound("click"); login(); }}
        onLogout={() => { playSound("click"); void logout(); }}
        onHoverSound={() => playSound("hover")}
        theme={theme}
        onToggleTheme={() => { playSound("click"); setTheme(t => (t === "light" ? "dark" : "light")); }}
      />

      <main className="relative z-10 flex w-full flex-1 flex-col">
        <AnimatePresence mode="wait">
          <motion.div
            key={route.path || "home"}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="flex flex-1 flex-col"
          >
            <Suspense
              fallback={
                <PageBody>
                  <SkeletonRows rows={5} height="h-16" />
                </PageBody>
              }
            >
              {renderPage()}
            </Suspense>
          </motion.div>
        </AnimatePresence>
      </main>

      <Footer />
      <AnimatePresence>{booting && <BootLoader onComplete={completeBoot} />}</AnimatePresence>
    </div>
  );
}
