import Link from "next/link";
import type { AnchorHTMLAttributes, ButtonHTMLAttributes, ComponentProps, ReactNode, Ref } from "react";
import styles from "./Button.module.css";

export type ButtonVariant = "primary" | "ghost" | "light" | "danger";
export type ButtonSize = "small" | "large";

type Look = {
  /** `light` is for a button on a photo; `danger` for something that can't be undone. */
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
 * What a button holds: while pending, a spinner over its label
 * (Button.module.css), which keeps its room and still names the button.
 */
function Inside({ pending, children }: { pending?: boolean; children: ReactNode }) {
  if (!pending) return children;
  return (
    <>
      <span className={styles.waiting}>{children}</span>
      <span className={styles.spinner} aria-hidden="true" />
    </>
  );
}

/**
 * A `<button>`. While `pending` it is disabled and, if its work takes more
 * than a moment, shows a spinner, for buttons whose work waits on a server
 * or takes a while. A form's submit button can use SubmitButton, which sets
 * `pending` itself.
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
      <Inside pending={pending}>{children}</Inside>
    </button>
  );
}

/**
 * A plain `<a>` styled as a button: external links, hash links, downloads.
 * While `pending`, as a Button is, it looks disabled, shows the spinner,
 * and a click on it does nothing, for one whose page takes a while to come.
 */
export function ButtonAnchor({
  variant,
  size,
  fit,
  className,
  pending,
  onClick,
  children,
  ...rest
}: Look & { pending?: boolean } & AnchorHTMLAttributes<HTMLAnchorElement>) {
  return (
    <a
      {...rest}
      className={buttonClass({ variant, size, fit, className })}
      aria-disabled={pending || undefined}
      aria-busy={pending || undefined}
      onClick={pending ? (event) => event.preventDefault() : onClick}
    >
      <Inside pending={pending}>{children}</Inside>
    </a>
  );
}

/** A Next `<Link>` styled as a button, for pages on this site. */
export function ButtonLink({ variant, size, fit, className, ...rest }: Look & ComponentProps<typeof Link>) {
  return <Link {...rest} className={buttonClass({ variant, size, fit, className })} />;
}
