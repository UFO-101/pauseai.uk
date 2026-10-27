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

/**
 * Two dates side by side, a dash between: from and to, each a date field
 * with its own name and label. Goes in a FieldSet, which names the pair.
 */
export function DateRange({ from, to }: { from: DateProps; to: DateProps }) {
  return (
    <span className={styles.dateRange}>
      <input {...from} type="date" className={styles.control} />
      <span aria-hidden="true">–</span>
      <input {...to} type="date" className={styles.control} />
    </span>
  );
}

type DateProps = Omit<InputProps, "type"> & { "aria-label": string };

export function Select(props: Omit<SelectHTMLAttributes<HTMLSelectElement>, "className">) {
  return <select {...props} className={styles.control} />;
}

export function TextArea(props: Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, "className">) {
  return <textarea {...props} className={`${styles.control} ${styles.textarea}`} />;
}

export function FileInput(props: Omit<InputProps, "type">) {
  return <input {...props} type="file" className={styles.file} />;
}

/**
 * A checkbox with its label beside it. Controlled, with `checked` and
 * `onChange`, which gets whether it's now ticked; or, in a form that posts
 * it, `defaultChecked`, sending `value` while ticked.
 */
export function Checkbox({
  id,
  name,
  value,
  checked,
  defaultChecked,
  disabled,
  onChange,
  children,
}: {
  id?: string;
  name?: string;
  value?: string;
  checked?: boolean;
  defaultChecked?: boolean;
  disabled?: boolean;
  onChange?: (checked: boolean) => void;
  children: ReactNode;
}) {
  return (
    <label className={styles.checkboxLabel} htmlFor={id}>
      <input
        id={id}
        name={name}
        type="checkbox"
        className={styles.checkbox}
        value={value}
        checked={checked}
        defaultChecked={defaultChecked}
        disabled={disabled}
        onChange={onChange && ((e) => onChange(e.target.checked))}
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
