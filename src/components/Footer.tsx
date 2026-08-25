import { SocialIcon } from "./ui/SocialIcon";
import React from "react";
import { PRIMARY_NAV, DISCORD_INVITE } from "../data/site";
import { SOCIAL_LINKS } from "../data/static";
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
          Community &amp; Socials
        </p>
        <ul className="mt-3 flex flex-col gap-2.5">
          {SOCIAL_LINKS.map((link) => (
            <li key={link.platform}>
              <a
                href={link.url}
                target="_blank"
                rel="noreferrer"
                className="group font-mono text-[12.5px] text-bb-ink-soft transition-colors hover:text-bb-yellow flex items-center gap-2.5"
              >
                <span className="text-bb-yellow shrink-0 group-hover:scale-110 transition-transform">
                  <SocialIcon platform={link.platform} className="w-3.5 h-3.5" />
                </span>
                <span className="font-medium">{link.label === "Discord" ? "Discord Server" : link.label}</span>
              </a>
            </li>
          ))}
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
