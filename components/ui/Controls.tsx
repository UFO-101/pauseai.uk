import type { InputHTMLAttributes, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes } from "react";
import styles from "./Controls.module.css";

// Every form control on the site: a text box, a select, a text area, a file
// picker, a checkbox and a row of choices. Each has the orange focus ring,
// and its height and text size follow the density (styles/tokens.css). A
// label goes round or over it (Field.tsx).

type InputProps = Omit<InputHTMLAttributes<HTMLInputElement>, "className">;

/** A text, email, search, date or time field. */
export function TextInput(props: InputProps) {
  return <input {...props} className={styles.control} />;
}

export function Select(props: Omit<SelectHTMLAttributes<HTMLSelectElement>, "className">) {
  return <select {...props} className={styles.control} />;
}

export function TextArea(props: Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, "className">) {
  return <textarea {...props} className={`${styles.control} ${styles.textarea}`} />;
}

export function FileInput(props: Omit<InputProps, "type">) {
  return <input {...props} type="file" className={styles.file} />;
}

/** A checkbox with its label beside it. Controlled: `onChange` gets whether it's now ticked. */
export function Checkbox({
  id,
  name,
  checked,
  onChange,
  children,
}: {
  id?: string;
  name?: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  children: ReactNode;
}) {
  return (
    <label className={styles.checkboxLabel} htmlFor={id}>
      <input
        id={id}
        name={name}
        type="checkbox"
        className={styles.checkbox}
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
      />
      <span>{children}</span>
    </label>
  );
}

/** A row of mutually exclusive buttons, e.g. a QR code's size. */
export function Segmented<T extends string | boolean>({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
}) {
  return (
    <div className={styles.segmented} role="radiogroup" aria-label={label}>
      {options.map((o) => (
        <button
          key={String(o.value)}
          type="button"
          role="radio"
          aria-checked={o.value === value}
          className={styles.segment}
          onClick={() => onChange(o.value)}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
