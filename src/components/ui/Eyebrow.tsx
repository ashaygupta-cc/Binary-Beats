import React from "react";

interface EyebrowProps {
  tone?: "accent" | "muted";
  /** Numbered-section prefix — e.g. number="01" renders "/01 · " before the
   *  label. Kept from the old system; fits the brutalist "systemized/
   *  cataloged" voice even better than it fit paper. */
  number?: string;
  className?: string;
  children: React.ReactNode;
}

/** Merges the old .eyebrow/.eyebrow-term/.label-caps into one component —
 *  now that dark is the app's default register, the old paper/terminal
 *  eyebrow duplication has nothing left to distinguish. */
export const Eyebrow: React.FC<EyebrowProps> = ({ tone = "accent", number, className = "", children }) => (
  <span className={`${tone === "accent" ? "eyebrow" : "eyebrow-muted"} ${className}`}>
    {number && (
      <>
        /{number}
        <span className="text-bb-ink-faint normal-case">·</span>
      </>
    )}
    {children}
  </span>
);
