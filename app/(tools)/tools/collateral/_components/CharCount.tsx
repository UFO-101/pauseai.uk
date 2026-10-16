import styles from "./CharCount.module.css";

/** Shows "n / max" once a field is 80% full, so a volunteer knows why typing stops. */
export default function CharCount({ value, max }: { value: string; max?: number }) {
  if (!max || value.length < max * 0.8) return null;
  return (
    <span className={value.length >= max ? `${styles.count} ${styles.full}` : styles.count} aria-live="polite">
      {value.length} / {max}
    </span>
  );
}
