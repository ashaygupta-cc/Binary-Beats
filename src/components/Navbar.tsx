import React, { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { RatingBadge } from './ui/RatingBadge';
import { Tag } from './ui/Tag';
import { Button } from './ui/Button';
import { PRIMARY_NAV, DISCORD_INVITE } from '../data/site';
import { navigate } from '../lib/router';

interface NavbarProps {
  /** Current route page id. */
  activeTab: string;
  rating: number | null;
  /** Display name, or null when logged out. */
  username: string | null;
  avatarUrl?: string | null;
  isMember: boolean;
  authStatus: 'checking' | 'authenticated' | 'unauthenticated';
  discordId?: string | null;
  onLogin: () => void;
  onLogout: () => void;
  onHoverSound: () => void;
  theme: 'light' | 'dark';
  onToggleTheme: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab, rating, username, avatarUrl, isMember, authStatus, discordId,
  onLogin, onLogout, onHoverSound, theme, onToggleTheme,
}) => {
  const [menuOpen, setMenuOpen] = useState(false);

  // Close the drawer on route change — otherwise tapping a link on mobile
  // navigates but leaves the overlay covering the page.
  useEffect(() => { setMenuOpen(false); }, [activeTab]);

  // Lock body scroll while the drawer is open, and release it on unmount so a
  // route change mid-animation can't leave the page permanently unscrollable.
  useEffect(() => {
    document.body.style.overflow = menuOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [menuOpen]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setMenuOpen(false); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const go = (id: string) => {
    navigate(id === 'home' ? '' : id);
  };

  return (
    <>
      <nav className="sticky top-0 z-50 w-full border-b-[1.5px] border-bb-line-strong bg-bb-ground/95 backdrop-blur-xl">
        <div className="mx-auto flex h-16 w-full max-w-[1400px] items-center justify-between gap-3 px-4 sm:px-6 lg:px-8">
          {/* Logo */}
          <div
            className="group flex shrink-0 cursor-pointer select-none items-center gap-2.5"
            onClick={() => go('home')}
            onMouseEnter={onHoverSound}
            role="link" tabIndex={0}
            onKeyDown={e => { if (e.key === 'Enter') go('home'); }}
          >
            <img
              src="https://raw.githubusercontent.com/ashaygupta-cc/ashaygupta-cc/main/Binary%20Beats.webp"
              alt="Binary Beats Logo"
              className="h-7 w-7 rounded object-contain transition-transform group-hover:scale-105"
            />
            <span className="font-display text-[17px] font-bold tracking-tight text-bb-ink">
              Binary Beats
            </span>
          </div>

          {/* Desktop nav */}
          <div className="hidden items-center gap-1 lg:flex">
            {PRIMARY_NAV.map(t => {
              const isActive = activeTab === t.id;
              return (
                <button
                  key={t.id}
                  onClick={() => go(t.id)}
                  onMouseEnter={onHoverSound}
                  aria-current={isActive ? 'page' : undefined}
                  className={`relative flex cursor-pointer items-center gap-1.5 rounded px-3 py-2 font-mono text-[13px] font-medium transition-colors duration-150 ${
                    isActive ? 'text-bb-ground' : 'text-bb-ink-soft hover:text-bb-ink'
                  }`}
                >
                  {isActive && (
                    <motion.div
                      layoutId="navIndicator"
                      className="absolute inset-0 rounded bg-bb-yellow"
                      transition={{ type: 'spring', stiffness: 500, damping: 35 }}
                    />
                  )}
                  <span className={`relative z-10 text-[9px] ${isActive ? 'text-bb-ground/60' : 'text-bb-ink-faint'}`}>{t.n}</span>
                  <span className="relative z-10 whitespace-nowrap">{t.label}</span>
                </button>
              );
            })}
          </div>

          {/* Right side */}
          <div className="flex shrink-0 items-center gap-2 sm:gap-3">
            <button
              onClick={onToggleTheme}
              onMouseEnter={onHoverSound}
              aria-label={theme === 'light' ? 'Switch to dark theme' : 'Switch to light theme'}
              className="flex h-8 w-8 cursor-pointer items-center justify-center rounded text-bb-ink-faint transition-all hover:bg-bb-ink/[0.06] hover:text-bb-yellow"
            >
              {theme === 'light' ? (
                <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21.752 15.002A9.72 9.72 0 0118 15.75c-5.385 0-9.75-4.365-9.75-9.75 0-1.33.266-2.597.748-3.752A9.753 9.753 0 003 11.25C3 16.635 7.365 21 12.75 21a9.753 9.753 0 009.002-5.998z" />
                </svg>
              ) : (
                <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v2.25m6.364.386-1.591 1.591M21 12h-2.25m-.386 6.364-1.591-1.591M12 18.75V21m-4.773-4.227-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0z" />
                </svg>
              )}
            </button>

            {rating !== null && (
              <div className="hidden items-center gap-1.5 rounded-sm border border-bb-line-strong px-2.5 py-1 text-[13px] md:flex">
                <RatingBadge rating={rating} />
              </div>
            )}

            {authStatus === 'authenticated' && username ? (
              <>
                <div className="hidden h-5 w-px bg-bb-line sm:block" />
                <button
                  className="flex cursor-pointer items-center gap-2.5"
                  onClick={() => discordId && navigate(`u/${discordId}`)}
                  onMouseEnter={onHoverSound}
                  aria-label="Open your profile"
                >
                  {avatarUrl ? (
                    <img src={avatarUrl} alt="" className="h-8 w-8 rounded-full border border-bb-line-strong" />
                  ) : (
                    <span className="flex h-8 w-8 items-center justify-center rounded-full bg-bb-ink font-mono text-[11px] font-bold text-bb-ground">
                      {username[0].toUpperCase()}
                    </span>
                  )}
                  <span className="hidden max-w-[10rem] truncate text-[13px] font-medium text-bb-ink-soft xl:inline">
                    {username}
                  </span>
                  {!isMember && <Tag tone="warning" className="hidden sm:inline-flex">guest</Tag>}
                </button>
                <button
                  onClick={onLogout}
                  onMouseEnter={onHoverSound}
                  className="hidden cursor-pointer font-mono text-[11px] uppercase tracking-wider text-bb-ink-faint transition-colors hover:text-bb-danger lg:inline"
                >
                  Sign out
                </button>
              </>
            ) : authStatus === 'unauthenticated' ? (
              <Button variant="primary" size="sm" onClick={onLogin} onMouseEnter={onHoverSound}>
                <span className="hidden sm:inline">Sign in with&nbsp;</span>Discord
              </Button>
            ) : null}

            {/* Hamburger — the old navbar simply hid the tabs below md with no
                replacement, so the site was unnavigable on phones. */}
            <button
              onClick={() => setMenuOpen(o => !o)}
              aria-label={menuOpen ? 'Close menu' : 'Open menu'}
              aria-expanded={menuOpen}
              className="flex h-9 w-9 cursor-pointer items-center justify-center rounded border-[1.5px] border-bb-line-strong text-bb-ink transition-colors hover:border-bb-ink lg:hidden"
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                {menuOpen
                  ? <path strokeLinecap="round" d="M6 6l12 12M18 6L6 18" />
                  : <path strokeLinecap="round" d="M4 7h16M4 12h16M4 17h16" />}
              </svg>
            </button>
          </div>
        </div>
      </nav>

      {/* Mobile drawer */}
      <AnimatePresence>
        {menuOpen && (
          <motion.div
            key="drawer"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="fixed inset-0 z-40 lg:hidden"
          >
            <div className="absolute inset-0 bg-bb-ground/80" onClick={() => setMenuOpen(false)} />
            <motion.div
              initial={{ y: -12 }}
              animate={{ y: 0 }}
              exit={{ y: -12 }}
              transition={{ duration: 0.18 }}
              className="absolute inset-x-0 top-16 max-h-[calc(100dvh-4rem)] overflow-y-auto border-b-[1.5px] border-bb-line-strong bg-bb-ground px-4 pb-6 pt-4 sm:px-6"
            >
              <ul className="flex flex-col gap-2">
                {PRIMARY_NAV.map(t => {
                  const isActive = activeTab === t.id;
                  return (
                    <li key={t.id}>
                      <button
                        onClick={() => go(t.id)}
                        className={`flex w-full cursor-pointer items-center gap-3 rounded border-[1.5px] px-4 py-3 text-left font-mono text-[14px] font-medium transition-colors ${
                          isActive
                            ? 'border-bb-border-hard bg-bb-yellow text-bb-ground'
                            : 'border-bb-line-strong text-bb-ink-soft hover:border-bb-ink hover:text-bb-ink'
                        }`}
                      >
                        <span className={`text-[10px] ${isActive ? 'text-bb-ground/60' : 'text-bb-ink-faint'}`}>{t.n}</span>
                        {t.short ?? t.label}
                      </button>
                    </li>
                  );
                })}
              </ul>

              <div className="mt-4 flex flex-col gap-2 border-t border-bb-line pt-4">
                <Button as="a" href={DISCORD_INVITE} target="_blank" rel="noreferrer" variant="primary" size="md">
                  Join the Discord
                </Button>
                {authStatus === 'authenticated' && (
                  <Button variant="outline" size="md" onClick={onLogout}>Sign out</Button>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};
