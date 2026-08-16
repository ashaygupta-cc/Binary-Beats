import React from "react";
import { PRIMARY_NAV, DISCORD_INVITE } from "../data/site";
import { navigate } from "../lib/router";
import { Tag } from "./ui/Tag";

/** Site footer — reads the same nav map as the navbar so the two can never
 *  drift. Public by design: everything linked here is browsable logged out. */
export const Footer: React.FC = () => (
  <footer className="relative z-10 mt-12 w-full border-t-[1.5px] border-bb-line-strong">
    <div className="mx-auto grid w-full max-w-[1400px] gap-8 px-4 py-10 sm:px-6 md:grid-cols-[1.5fr_1fr_1fr] lg:px-8">
      <div>
        <div className="flex items-center gap-2.5">
          <img
            src="https://raw.githubusercontent.com/ashaygupta-cc/ashaygupta-cc/main/Binary%20Beats.webp"
            alt="Binary Beats Logo"
            className="h-7 w-7 rounded object-contain"
          />
          <span className="font-display text-[17px] font-bold tracking-tight text-bb-ink">
            Binary Beats
          </span>
        </div>
        <p className="mt-3 max-w-sm text-[13px] leading-relaxed text-bb-ink-soft">
          A competitive programming community that lives on Discord. This site is
          the scoreboard, the archive and the practice ground around it.
        </p>
        <Tag tone="neutral" bracket className="mt-4">
          bot is the source of truth
        </Tag>
      </div>

      <nav aria-label="Footer">
        <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-bb-ink-faint">
          Explore
        </p>
        <ul className="mt-3 flex flex-col gap-2">
          {PRIMARY_NAV.map((t) => (
            <li key={t.id}>
              <button
                onClick={() => navigate(t.id === "home" ? "" : t.id)}
                className="cursor-pointer font-mono text-[13px] text-bb-ink-soft transition-colors hover:text-bb-yellow"
              >
                {t.label}
              </button>
            </li>
          ))}
        </ul>
      </nav>

      <div>
        <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-bb-ink-faint">
          Community
        </p>
        <ul className="mt-3 flex flex-col gap-2">
          <li>
            <a
              href={DISCORD_INVITE}
              target="_blank"
              rel="noreferrer"
              className="font-mono text-[13px] text-bb-ink-soft transition-colors hover:text-bb-yellow"
            >
              Discord server
            </a>
          </li>
          <li>
            <a
              href="https://codeforces.com"
              target="_blank"
              rel="noreferrer"
              className="font-mono text-[13px] text-bb-ink-soft transition-colors hover:text-bb-yellow"
            >
              Codeforces
            </a>
          </li>
          <li>
            <a
              href="https://leetcode.com"
              target="_blank"
              rel="noreferrer"
              className="font-mono text-[13px] text-bb-ink-soft transition-colors hover:text-bb-yellow"
            >
              LeetCode
            </a>
          </li>
        </ul>
      </div>
    </div>

    <div className="border-t border-bb-line">
      <div className="mx-auto w-full max-w-[1400px] px-4 py-4 sm:px-6 lg:px-8">
        <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-bb-ink-faint">
          Binary Beats — built by the community
        </p>
      </div>
    </div>
  </footer>
);
