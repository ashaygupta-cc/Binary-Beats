import React from "react";

type ButtonVariant = "primary" | "outline" | "ghost" | "danger";
type ButtonSize = "sm" | "md";

interface ButtonOwnProps {
  variant?: ButtonVariant;
  size?: ButtonSize;
}

type ButtonAsButton = ButtonOwnProps & { as?: "button" } & Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "as">;
type ButtonAsAnchor = ButtonOwnProps & { as: "a" } & Omit<React.AnchorHTMLAttributes<HTMLAnchorElement>, "as">;

export type ButtonProps = ButtonAsButton | ButtonAsAnchor;

const SIZE_CLASSES: Record<ButtonSize, string> = {
  sm: "h-8 px-3 text-[11px] gap-1.5",
  md: "h-9 px-4 text-xs gap-2",
};

const VARIANT_CLASSES: Record<ButtonVariant, string> = {
  primary:
    "bg-bb-yellow text-bb-ground border-2 border-bb-border-hard shadow-sticker hover:bg-bb-yellow-dim active:translate-x-[3px] active:translate-y-[3px] active:shadow-none",
  outline:
    "bg-transparent text-bb-ink border-[1.5px] border-bb-line-strong hover:border-bb-ink hover:bg-bb-ink/[0.05]",
  ghost:
    "bg-transparent text-bb-ink-soft border border-transparent hover:text-bb-ink hover:bg-bb-ink/[0.05]",
  danger:
    "bg-bb-danger text-bb-ground border-2 border-bb-border-hard shadow-sticker-danger hover:brightness-110 active:translate-x-[3px] active:translate-y-[3px] active:shadow-none",
};

const BASE =
  "inline-flex items-center justify-center rounded font-mono font-bold uppercase tracking-wider transition-all disabled:opacity-40 disabled:pointer-events-none cursor-pointer select-none";

/** Scoreboard-brutalist button — sharp corners, thick border, hard offset
 *  shadow on primary/danger that "presses in" on :active instead of any
 *  blur/glow. Replaces the old .btn-primary/.btn-outline CSS classes. */
export const Button: React.FC<ButtonProps> = ({ variant = "outline", size = "md", className = "", ...props }) => {
  const classes = `${BASE} ${SIZE_CLASSES[size]} ${VARIANT_CLASSES[variant]} ${className}`;

  if (props.as === "a") {
    const { as: _as, ...rest } = props;
    return <a className={classes} {...rest} />;
  }
  const { as: _as, ...rest } = props as ButtonAsButton;
  return <button type={rest.type ?? "button"} className={classes} {...rest} />;
};
