import React, { useState } from "react";
import { motion } from "motion/react";
import { Panel } from "../ui/Panel";
import { Eyebrow } from "../ui/Eyebrow";
import { Button } from "../ui/Button";

interface HandleLinkCardProps {
  validating: boolean;
  error: string | null;
  onLink: (handle: string) => void;
  playSound: (type: "click" | "hover") => void;
}

const STEPS = [
  { n: "01", label: "Link", desc: "your public Codeforces handle" },
  { n: "02", label: "Draw", desc: "a rating-matched problem set" },
  { n: "03", label: "Solve", desc: "on codeforces.com — we watch for it" },
];

export const HandleLinkCard: React.FC<HandleLinkCardProps> = ({ validating, error, onLink, playSound }) => {
  const [value, setValue] = useState("");

  const submit = () => {
    if (!value.trim() || validating) return;
    playSound("click");
    onLink(value);
  };

  return (
    <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} className="max-w-2xl mx-auto w-full">
      <Panel bracket className="overflow-hidden p-10 text-center">
        <Eyebrow>Codeforces Arena</Eyebrow>
        <h3 className="font-display font-extrabold text-3xl text-bb-ink mt-3 mb-3">Link your Codeforces handle</h3>
        <p className="text-sm text-bb-ink/55 leading-relaxed max-w-md mx-auto mb-8">
          No password, no OAuth — your public profile and submissions are all this needs to pick
          rating-matched problems and detect when you solve them.
        </p>

        <div className="flex items-stretch justify-center gap-1.5 sm:gap-2.5 max-w-lg mx-auto mb-8">
          {STEPS.map((s, i) => (
            <React.Fragment key={s.n}>
              <div className="flex-1 rounded-sm border-[1.5px] border-bb-line bg-bb-ground/40 p-3 text-left">
                <span className="text-[9px] font-mono font-bold text-bb-yellow">{s.n}</span>
                <div className="text-xs font-bold text-bb-ink mt-1">{s.label}</div>
                <div className="text-[9px] font-mono text-bb-ink/40 mt-1 leading-relaxed">{s.desc}</div>
              </div>
              {i < STEPS.length - 1 && (
                <div aria-hidden="true" className="flex items-center shrink-0 text-bb-ink/20 text-xs select-none">
                  →
                </div>
              )}
            </React.Fragment>
          ))}
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-3 max-w-sm mx-auto">
          <input
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") submit();
            }}
            placeholder="your codeforces handle"
            disabled={validating}
            className="w-full h-11 px-4 rounded text-xs font-mono text-bb-ink bg-bb-ground placeholder-bb-ink/30 focus:outline-none border-[1.5px] border-bb-line focus:border-bb-line-strong transition-colors disabled:opacity-50"
          />
          <Button
            variant="primary"
            size="md"
            onClick={submit}
            onMouseEnter={() => playSound("hover")}
            disabled={validating}
            className="shrink-0 w-full sm:w-auto"
          >
            {validating ? "Checking…" : "Link Handle"}
          </Button>
        </div>

        {error && <p className="text-xs font-mono text-bb-danger mt-4">{error}</p>}
      </Panel>
    </motion.div>
  );
};
