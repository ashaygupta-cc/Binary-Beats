import { useEffect, useState } from "react";

/** Animates a number counting up from 0 to `target` over `durationMs` — used
 *  for scoreboard/verdict reveals where the final number should land with a
 *  bit of ceremony instead of just appearing. */
export function useCountUp(target: number, durationMs = 700): number {
  const [value, setValue] = useState(0);

  useEffect(() => {
    let raf: number;
    const start = performance.now();

    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / durationMs);
      const eased = 1 - Math.pow(1 - t, 3);
      setValue(Math.round(target * eased));
      if (t < 1) raf = requestAnimationFrame(tick);
    };

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, durationMs]);

  return value;
}
