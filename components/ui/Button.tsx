import Link from "next/link";
import type { AnchorHTMLAttributes, ButtonHTMLAttributes, ComponentProps, Ref } from "react";
import styles from "./Button.module.css";

export type ButtonVariant = "primary" | "ghost" | "light";
export type ButtonSize = "small" | "large";

type Look = {
  /** `light` is for a button on a photo. */
  variant: ButtonVariant;
  /** Medium when left out. */
  size?: ButtonSize;
  /** Fit its text on a phone too, rather than fill the width. */
  fit?: boolean;
};

/**
 * The class that makes an element look like a button. Exported for buttons
 * that aren't one of the three below (CopyLinkButton). A `className` is for
 * the button's place in the layout, never its look (Button.module.css).
 */
export function buttonClass({ variant, size, fit, className }: Look & { className?: string }) {
  return [styles.btn, styles[variant], size && styles[size], fit && styles.fit, className].filter(Boolean).join(" ");
}

/**
 * A `<button>`. While `pending` it is disabled and shows a spinner, for
 * buttons whose work takes a while. A form's submit button can use
 * SubmitButton, which sets `pending` itself.
 */
export function Button({
  variant,
  size,
  fit,
  className,
  pending,
  disabled,
  children,
  ...rest
}: Look & { pending?: boolean; ref?: Ref<HTMLButtonElement> } & ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      {...rest}
      className={buttonClass({ variant, size, fit, className })}
      disabled={disabled || pending}
      aria-busy={pending || undefined}
    >
      {pending && <span className={styles.spinner} aria-hidden="true" />}
      {children}
    </button>
  );
}

/** A plain `<a>` styled as a button: external links, hash links, downloads. */
export function ButtonAnchor({
  variant,
  size,
  fit,
  className,
  ...rest
}: Look & AnchorHTMLAttributes<HTMLAnchorElement>) {
  return <a {...rest} className={buttonClass({ variant, size, fit, className })} />;
}

/** A Next `<Link>` styled as a button, for pages on this site. */
export function ButtonLink({ variant, size, fit, className, ...rest }: Look & ComponentProps<typeof Link>) {
  return <Link {...rest} className={buttonClass({ variant, size, fit, className })} />;
}
