import React from "react";

type DividerVariant = "hairline" | "thick" | "dashed";
type DividerOrientation = "horizontal" | "vertical";

interface DividerProps {
  variant?: DividerVariant;
  orientation?: DividerOrientation;
  className?: string;
}

export const Divider: React.FC<DividerProps> = ({ variant = "hairline", orientation = "horizontal", className = "" }) => {
  const horizontal = orientation === "horizontal";
  const size = horizontal ? "w-full h-0" : "h-full w-0";
  const side = horizontal ? "border-t" : "border-l";
  const weight = variant === "thick" ? `${side}-2` : side;
  const style = variant === "dashed" ? "border-dashed" : "";
  const color = variant === "thick" || variant === "dashed" ? "border-bb-line-strong" : "border-bb-line";

  return <div className={`${size} ${weight} ${style} ${color} ${className}`} />;
};
