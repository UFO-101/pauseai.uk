import type { ReactNode } from "react";
import { LIBRARY_PHOTOS, type LibraryPhoto } from "@/lib/collateral/photos";
import styles from "./Choices.module.css";

/** A column of choice cards: a radio group, or a group of checkboxes. */
export function ChoiceGrid({
  role,
  label,
  children,
}: {
  role: "radiogroup" | "group";
  label: string;
  children: ReactNode;
}) {
  return (
    <div className={styles.grid} role={role} aria-label={label}>
      {children}
    </div>
  );
}

/** A card in a radio group: its name in bold, and a line about it. */
export function Choice({
  checked,
  onClick,
  title,
  description,
}: {
  checked: boolean;
  onClick: () => void;
  title: ReactNode;
  description: ReactNode;
}) {
  return (
    <button type="button" role="radio" aria-checked={checked} className={styles.choice} onClick={onClick}>
      <strong>{title}</strong>
      <span className={styles.note}>{description}</span>
    </button>
  );
}

/** A card with a checkbox: its name beside the box, and a line about it. */
export function CheckboxChoice({
  checked,
  onChange,
  title,
  note,
}: {
  checked: boolean;
  onChange: () => void;
  title: ReactNode;
  note: ReactNode;
}) {
  return (
    <label className={checked ? `${styles.choice} ${styles.checked}` : styles.choice}>
      <span className={styles.head}>
        <input type="checkbox" className={styles.checkbox} checked={checked} onChange={onChange} />
        <strong>{title}</strong>
      </span>
      <span className={styles.note}>{note}</span>
    </label>
  );
}

/** The library's photos, as buttons. `current` is the photo in use, marked when it's one of these. */
export function PhotoLibrary({
  current,
  onPick,
}: {
  current?: { kind: "library"; id: string } | { kind: "upload" };
  onPick: (item: LibraryPhoto) => void;
}) {
  return (
    <div className={styles.photos}>
      {LIBRARY_PHOTOS.map((item) => (
        <button
          key={item.id}
          type="button"
          className={styles.photo}
          aria-label={item.label}
          aria-pressed={current?.kind === "library" && current.id === item.id}
          title={item.label}
          onClick={() => onPick(item)}
          style={{ backgroundImage: `url(${item.thumb})` }}
        />
      ))}
    </div>
  );
}
