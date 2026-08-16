import React, { useMemo } from "react";
import { motion } from "motion/react";

interface ConfettiBurstProps {
  /** Change this to replay the burst (e.g. a fresh submission id). */
  burstKey: string | number;
  count?: number;
  colors?: string[];
  className?: string;
}

const DEFAULT_COLORS = ["#FFD400", "#35D46A", "#3AA0FF", "#F2F2ED"];

/** A one-shot radial particle burst — no library, just randomized motion.div
 *  trajectories. Reserved for genuine "you won" moments (AC, duel victory). */
export const ConfettiBurst: React.FC<ConfettiBurstProps> = ({ burstKey, count = 28, colors = DEFAULT_COLORS, className = "" }) => {
  const particles = useMemo(() => {
    return Array.from({ length: count }, (_, i) => {
      const angle = (Math.PI * 2 * i) / count + (Math.random() - 0.5) * 0.6;
      const distance = 60 + Math.random() * 110;
      return {
        id: i,
        x: Math.cos(angle) * distance,
        y: Math.sin(angle) * distance - 20,
        rotate: (Math.random() - 0.5) * 360,
        color: colors[i % colors.length],
        size: 4 + Math.random() * 5,
        delay: Math.random() * 0.08,
        round: i % 3 === 0,
      };
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [burstKey, count]);

  return (
    <div className={`absolute inset-0 pointer-events-none overflow-visible ${className}`} aria-hidden="true">
      {particles.map((p) => (
        <motion.span
          key={`${burstKey}-${p.id}`}
          initial={{ opacity: 1, x: 0, y: 0, rotate: 0, scale: 0.6 }}
          animate={{ opacity: 0, x: p.x, y: p.y + 50, rotate: p.rotate, scale: 1 }}
          transition={{ duration: 1.15, delay: p.delay, ease: [0.16, 1, 0.3, 1] }}
          style={{
            position: "absolute",
            left: "50%",
            top: "50%",
            width: p.size,
            height: p.size,
            background: p.color,
            borderRadius: p.round ? "50%" : "2px",
          }}
        />
      ))}
    </div>
  );
};
