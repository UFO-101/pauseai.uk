import styles from "./NotIcon.module.css";

/** The mark of what leaves out, as Except is on the filter bar: a circle, struck through. */
export default function NotIcon() {
  return (
    <svg className={styles.notIcon} width="14" height="14" viewBox="0 0 16 16" aria-hidden="true">
      <circle cx="8" cy="8" r="6.5" />
      <path d="M3.5 12.5l9-9" />
    </svg>
  );
}
