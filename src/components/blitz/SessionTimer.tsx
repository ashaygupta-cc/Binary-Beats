import React, { useEffect, useState } from "react";
import { Panel } from "../ui/Panel";
import { Eyebrow } from "../ui/Eyebrow";
import { Countdown } from "../ui/Countdown";

interface SessionTimerProps {
  startedAtSeconds: number;
  running: boolean;
  mode?: string;
}

const MODE_LIMITS: Record<string, number> = {
  dsa_blitz: 900,     // 15 mins
  dsa_duel: 1200,    // 20 mins
  cp_blitz: 1500,    // 25 mins
  cp_duel: 1800,     // 30 mins
  icpc_blitz: 2400,  // 40 mins
  icpc_duel: 2700,   // 45 mins
};

export const SessionTimer: React.FC<SessionTimerProps> = ({ startedAtSeconds, running, mode = "dsa_blitz" }) => {
  const [now, setNow] = useState(() => Math.floor(Date.now() / 1000));

  useEffect(() => {
    if (!running) return;
    const id = setInterval(() => setNow(Math.floor(Date.now() / 1000)), 1000);
    return () => clearInterval(id);
  }, [running]);

  const totalLimit = MODE_LIMITS[mode] ?? 1200;
  const elapsed = Math.max(0, now - startedAtSeconds);
  const remaining = Math.max(0, totalLimit - elapsed);
  const isExpired = remaining === 0;

  return (
    <Panel bracket className="p-5 flex flex-col items-center text-center">
      <Eyebrow className="mb-3 flex items-center gap-1.5">
        {isExpired ? "Time Expired" : "Time Left ⏳"}
        {running && !isExpired && (
          <span className="relative flex w-1.5 h-1.5">
            <span className="absolute inset-0 rounded-full bg-bb-yellow animate-pulse-accent" />
            <span className="absolute -inset-1 rounded-full border border-bb-yellow/50 animate-ping" />
          </span>
        )}
      </Eyebrow>
      <Countdown
        seconds={remaining}
        blink={running && !isExpired}
        className={`text-4xl leading-none ${isExpired ? "text-bb-danger font-extrabold" : "text-bb-yellow"}`}
      />
    </Panel>
  );
};
