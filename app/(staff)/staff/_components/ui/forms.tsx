import type { ComponentProps } from "react";
import styles from "./forms.module.css";

type FormProps = Omit<ComponentProps<"form">, "className">;

/** A row of filters over a list: labelled selects and inputs, and a button, wrapping when narrow. */
export function Filters(props: FormProps) {
  return <form {...props} className={styles.filters} />;
}

/** A form of fields in a column, each a label with its control inside it. */
export function StaffForm(props: FormProps) {
  return <form {...props} className={styles.form} />;
}
