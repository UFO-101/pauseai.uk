import type { ComponentProps } from "react";
import styles from "./Form.module.css";

// How a form lays out its fields. A `className` is for the form's place in
// a layout (its margins, its width), never its look.

type FormProps = ComponentProps<"form">;

/** A form of fields in a column, the density's gap apart. */
export function FormStack({ className, ...props }: FormProps) {
  return <form {...props} className={className ? `${styles.stack} ${className}` : styles.stack} />;
}

/**
 * A row of filters over a list: labelled selects and text boxes, and a small
 * button, along their bottoms, wrapping when narrow. At the compact
 * density, a control is the small button's height, so they line up.
 */
export function FilterForm({ className, ...props }: FormProps) {
  return <form {...props} className={className ? `${styles.filters} ${className}` : styles.filters} />;
}
