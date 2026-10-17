import type { ComponentProps, ReactNode } from "react";
import styles from "./FormParts.module.css";

/** The tool's one column, the letter's width, in line with the section's heading. */
export function Column({ children }: { children: ReactNode }) {
  return <div className={styles.tool}>{children}</div>;
}

/** A field: its label (with the control inside it) or a heading, and a hint in <small>. */
export function Field({ children }: { children: ReactNode }) {
  return <div className={styles.field}>{children}</div>;
}

/** A text box: the tool's look for every field a person types into. */
export function Input(props: Omit<ComponentProps<"input">, "className">) {
  return <input {...props} className={styles.input} />;
}

/** What went wrong, read out as it appears. */
export function ErrorText({ children }: { children: ReactNode }) {
  return (
    <p className={styles.error} role="alert">
      {children}
    </p>
  );
}

/** A note set apart with an orange edge. */
export function Notice({ children }: { children: ReactNode }) {
  return <p className={styles.notice}>{children}</p>;
}
