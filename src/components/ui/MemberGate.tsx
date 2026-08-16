import React from "react";
import { Panel } from "./Panel";
import { Button } from "./Button";
import { Eyebrow } from "./Eyebrow";

interface MemberGateProps {
  /** Name of the locked feature, e.g. "Duel Queue". */
  feature: string;
  /** Discord invite — keep in one place via src/data/content.ts. */
  inviteUrl: string;
  /** "anon" = not logged in at all; "outsider" = logged in, not in guild. */
  reason: "anon" | "outsider";
  /** Optional read-only preview rendered dimmed behind the gate. */
  preview?: React.ReactNode;
  onLogin?: () => void;
  playSound?: (type: "click" | "hover") => void;
}

/** The single lock surface for every members-only feature. Uses only
 *  existing tokens/primitives — no new colors, no new shadows, no blur.
 *  Brutalist rule kept: the gate is a hard bordered plate that sits ON the
 *  content, not a frosted overlay. */
export const MemberGate: React.FC<MemberGateProps> = ({
  feature,
  inviteUrl,
  reason,
  preview,
  onLogin,
  playSound,
}) => (
  <div className="relative w-full">
    {preview && (
      <div
        aria-hidden
        className="pointer-events-none select-none opacity-25 saturate-0"
      >
        {preview}
      </div>
    )}

    <div
      className={
        preview
          ? "absolute inset-0 flex items-center justify-center p-4 sm:p-6"
          : "w-full flex items-center justify-center p-4 sm:p-6"
      }
    >
      <Panel
        bracket
        className="w-full max-w-md p-5 sm:p-7 text-center shadow-sticker"
      >
        <Eyebrow number="00" tone="accent">
          Members Only
        </Eyebrow>

        <h3 className="mt-3 font-[family-name:var(--bb-font-display)] text-2xl sm:text-3xl font-800 uppercase leading-none tracking-tight text-bb-ink">
          {feature} is locked
        </h3>

        <p className="mt-3 text-[13px] leading-relaxed text-bb-ink-soft">
          {reason === "anon"
            ? "Sign in with Discord to see whether this is unlocked for you."
            : "This feature is exclusive to Binary Beats members. Join our Discord server to unlock it."}
        </p>

        <div className="mt-5 flex flex-col sm:flex-row gap-2 sm:gap-3 justify-center">
          {reason === "anon" ? (
            <Button
              variant="primary"
              size="md"
              className="w-full sm:w-auto"
              onClick={() => {
                playSound?.("click");
                onLogin?.();
              }}
              onMouseEnter={() => playSound?.("hover")}
            >
              Sign in with Discord
            </Button>
          ) : (
            <Button
              as="a"
              href={inviteUrl}
              target="_blank"
              rel="noreferrer"
              variant="primary"
              size="md"
              className="w-full sm:w-auto"
              onMouseEnter={() => playSound?.("hover")}
            >
              Join Server
            </Button>
          )}
          <Button
            as="a"
            href="#/leaderboards"
            variant="outline"
            size="md"
            className="w-full sm:w-auto"
            onMouseEnter={() => playSound?.("hover")}
          >
            Browse Public
          </Button>
        </div>

        <p className="mt-4 font-mono text-[10px] uppercase tracking-[0.18em] text-bb-ink-faint">
          Discord stays the hub · the site is the scoreboard
        </p>
      </Panel>
    </div>
  </div>
);
