import { SURVEY_META } from "@/lib/content/aiSentiment2026";
import styles from "./sentiment.module.css";

// The survey's headline numbers.
export default function HeadlineStats() {
  return (
    <section className={styles.stats}>
      <div className={`container ${styles.statsInner}`}>
        <div className={styles.stat}>
          <span className={styles.statValue}>{SURVEY_META.respondents.toLocaleString()}</span>
          <span className={styles.statLabel}>Respondents</span>
        </div>
        <div className={styles.stat}>
          <span className={styles.statValue}>{SURVEY_META.countries}</span>
          <span className={styles.statLabel}>Countries surveyed</span>
        </div>
        <div className={styles.stat}>
          <span className={styles.statValue}>60%</span>
          <span className={styles.statLabel}>Want development slowed, paused or stopped</span>
        </div>
      </div>
    </section>
  );
}
