import Link from "next/link";
import type { AnchorHTMLAttributes, ButtonHTMLAttributes, ComponentProps } from "react";
import styles from "./Button.module.css";

export type ButtonVariant = "primary" | "ghost";
export type ButtonSize = "small" | "large";

type Look = {
  variant: ButtonVariant;
  /** Medium when left out. */
  size?: ButtonSize;
};

/**
 * The class and data attributes that make an element look like a button.
 * Exported for markup built outside React (the cookie banner).
 */
export function buttonAttributes({ variant, size, className }: Look & { className?: string }) {
  return {
    className: [styles.btn, styles[variant], size && styles[size], className].filter(Boolean).join(" "),
    "data-button": "",
    "data-variant": variant,
  };
}

/** A `<button>`. */
export function Button({ variant, size, className, ...rest }: Look & ButtonHTMLAttributes<HTMLButtonElement>) {
  return <button {...rest} {...buttonAttributes({ variant, size, className })} />;
}

/** A plain `<a>` styled as a button: external links, hash links, downloads. */
export function ButtonAnchor({ variant, size, className, ...rest }: Look & AnchorHTMLAttributes<HTMLAnchorElement>) {
  return <a {...rest} {...buttonAttributes({ variant, size, className })} />;
}

/** A Next `<Link>` styled as a button, for pages on this site. */
export function ButtonLink({ variant, size, className, ...rest }: Look & ComponentProps<typeof Link>) {
  return <Link {...rest} {...buttonAttributes({ variant, size, className })} />;
}
