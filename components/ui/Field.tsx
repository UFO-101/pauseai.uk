import type { ReactNode } from "react";
import styles from "./Field.module.css";

// A form's words around its controls (Controls.tsx): labels, hints and
// what's wrong. Their sizes and spacing follow the density
// (styles/tokens.css): comfortable on the public site, compact where a
// container sets data-density="compact", as the staff interface does.

/**
 * A field: its label's words over the control inside it, so the label names
 * the control without an id. `label` can be a node, e.g. with a Required
 * mark. A `className` is for its place in a layout, such as a grid column.
 */
export function Field({ label, className, children }: { label: ReactNode; className?: string; children: ReactNode }) {
  return (
    <label className={className ? `${styles.field} ${className}` : styles.field}>
      <span className={styles.label}>{label}</span>
      {children}
    </label>
  );
}

/**
 * A field's label on its own, over a control elsewhere: a <label> for the
 * control `htmlFor` names, or a <span> over a group of buttons. `note`
 * follows it in lighter type.
 */
export function Label({
  htmlFor,
  id,
  note,
  children,
}: {
  htmlFor?: string;
  id?: string;
  note?: ReactNode;
  children: ReactNode;
}) {
  const content = (
    <>
      {children}
      {note && <span className={styles.note}>{note}</span>}
    </>
  );
  return htmlFor ? (
    <label className={styles.standalone} htmlFor={htmlFor} id={id}>
      {content}
    </label>
  ) : (
    <span className={styles.standalone} id={id}>
      {content}
    </span>
  );
}

/** A field with what goes under it: a Hint, a FieldError. Only groups them. */
export function FieldGroup({ children }: { children: ReactNode }) {
  return <div>{children}</div>;
}

/** A note under a control, in small grey type. Give it an `id` for the control's aria-describedby. */
export function Hint({ id, children }: { id?: string; children: ReactNode }) {
  return (
    <p className={styles.hint} id={id}>
      {children}
    </p>
  );
}

/**
 * What's wrong, in the danger colour with an orange rule beside it. `announce`
 * reads it out as it appears: "alert" to interrupt, for a form that just
 * failed; "status" to wait, for a field checked as it changes.
 */
export function FieldError({
  id,
  announce,
  children,
}: {
  id?: string;
  announce?: "alert" | "status";
  children: ReactNode;
}) {
  return (
    <p id={id} className={styles.error} role={announce}>
      {children}
    </p>
  );
}
