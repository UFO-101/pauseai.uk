import type { LintIssue } from "@/lib/collateral/lint";
import styles from "./Checks.module.css";

/** The automatic checks for a design, shown beside Download. */
export default function Checks({ issues, title = "Checks" }: { issues: LintIssue[]; title?: string }) {
  return (
    <div className={styles.checks} role="status">
      <strong>{title}</strong>
      {issues.length === 0 ? (
        <p className={`${styles.check} ${styles.ok}`}>✓ No problems found.</p>
      ) : (
        <ul className={styles.list}>
          {issues.map((issue) => (
            <li key={issue.id} className={issue.level === "warn" ? `${styles.check} ${styles.warn}` : styles.check}>
              <span className={styles.icon} aria-hidden="true">
                {issue.level === "warn" ? "⚠" : "ℹ"}
              </span>{" "}
              {issue.message}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
