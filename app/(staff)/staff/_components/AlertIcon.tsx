import styles from "./AlertIcon.module.css";

/** The icons' shapes: a pause for something waiting, a warning triangle for something broken. */
const PATHS = {
  amber: "M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20zm0 2a8 8 0 1 1 0 16 8 8 0 0 1 0-16zM9 8v8h2V8H9zm4 0v8h2V8h-2z",
  red: "M12 2 1 21h22L12 2zm0 4.8L19.5 19h-15L12 6.8zM11 10v5h2v-5h-2zm0 6v2h2v-2h-2z",
};

/** A small icon at the start of an alert, in its status colour: amber for waiting, red for broken. Decorative: the words say it. */
export default function AlertIcon({ tone }: { tone: "amber" | "red" }) {
  return (
    <svg className={`${styles.icon} ${styles[tone]}`} viewBox="0 0 24 24" aria-hidden="true">
      <path d={PATHS[tone]} />
    </svg>
  );
}
