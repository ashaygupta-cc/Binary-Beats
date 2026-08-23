import { Suspense, lazy, useEffect, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Navbar } from "./components/Navbar";
import { Footer } from "./components/Footer";
import { LeetCodeDashboard } from "./components/LeetCodeDashboard";

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

import { MemberGate } from "./components/ui/MemberGate";
import { EmptyState, PageBody, PageHeader, SkeletonRows } from "./components/ui/PageShell";
import { Button } from "./components/ui/Button";
import { synthSound } from "./utils/audio";
import { useDiscordAuth } from "./hooks/useDiscordAuth";
import { useCfHandle } from "./hooks/useCfHandle";
import { useRoute, navigate, ensureHash } from "./lib/router";
import { DISCORD_INVITE, navItem } from "./data/site";

type Theme = "light" | "dark";

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
        return <ChannelPage slug={slug} threadId={route.segments[2]} playSound={playSound} />;
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
    document.title = item ? `${item.label} · Binary Beats` : "Binary Beats";
  }, [page]);

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
    </div>
  );
}
