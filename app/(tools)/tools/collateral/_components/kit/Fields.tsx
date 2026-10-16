import type {
  ComponentProps,
  InputHTMLAttributes,
  ReactNode,
  SelectHTMLAttributes,
  TextareaHTMLAttributes,
} from "react";
import { Button } from "@/components/ui/Button";
import styles from "./Fields.module.css";

/**
 * A field's label: a <label> for the control `htmlFor` names, or a <span>
 * over a group of buttons. `note` follows it in lighter type.
 */
export function FieldLabel({ htmlFor, note, children }: { htmlFor?: string; note?: ReactNode; children: ReactNode }) {
  const content = (
    <>
      {children}
      {note && <span className={styles.note}>{note}</span>}
    </>
  );
  return htmlFor ? (
    <label className={styles.label} htmlFor={htmlFor}>
      {content}
    </label>
  ) : (
    <span className={styles.label}>{content}</span>
  );
}

type InputProps = Omit<InputHTMLAttributes<HTMLInputElement>, "className">;

/** A text, date or time field. */
export function TextInput(props: InputProps) {
  return <input {...props} className={styles.field} />;
}

export function Select(props: Omit<SelectHTMLAttributes<HTMLSelectElement>, "className">) {
  return <select {...props} className={styles.field} />;
}

export function TextArea(props: Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, "className">) {
  return <textarea {...props} className={`${styles.field} ${styles.textarea}`} />;
}

export function FileInput(props: Omit<InputProps, "type">) {
  return <input {...props} type="file" className={styles.file} />;
}

/**
 * A checkbox with its label beside it. A container can set
 * `--toggle-margin` (0 0 14px) and `--toggle-font-weight` (600) on itself,
 * for a list of them.
 */
export function Toggle({
  id,
  checked,
  onChange,
  children,
}: {
  id?: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  children: ReactNode;
}) {
  return (
    <label className={styles.toggle} htmlFor={id}>
      <input
        id={id}
        type="checkbox"
        className={styles.checkbox}
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
      />
      {children}
    </label>
  );
}

/** A row of mutually exclusive buttons, e.g. QR size. */
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

/** What's wrong with a field, with an orange rule beside it. `status` reads it out as it appears. */
export function FieldError({ id, status, children }: { id?: string; status?: boolean; children: ReactNode }) {
  return (
    <p id={id} className={styles.error} role={status ? "status" : undefined}>
      {children}
    </p>
  );
}

/** A Button in the form, with the form's focus ring. */
export function FormButton(props: Omit<ComponentProps<typeof Button>, "className">) {
  return <Button {...props} className={styles.ring} />;
}
