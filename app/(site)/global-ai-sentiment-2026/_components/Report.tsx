import type { ReactNode } from "react";
import { QUESTION_TEXT, SURVEY_META } from "@/lib/content/aiSentiment2026";
import GlobalAverageBar from "./GlobalAverageBar";
import styles from "./sentiment.module.css";

/** The line under the report's title. */
export function ReportLede({ children }: { children: ReactNode }) {
  return <p className={styles.heroLede}>{children}</p>;
}

/** One of the report's sections: a heading, an optional intro, then its chart. `muted` tints it. */
export function ReportSection({
  title,
  intro,
  muted = false,
  children,
}: {
  title: string;
  intro?: string;
  muted?: boolean;
  children: ReactNode;
}) {
  return (
    <section className={muted ? `${styles.section} ${styles.sectionMuted}` : styles.section}>
      <div className="container">
        <h2>{title}</h2>
        {intro && <p className={styles.sectionIntro}>{intro}</p>}
        {children}
      </div>
    </section>
  );
}

/** The question the survey asked, the headline answer, the global average, and the source. */
export function TheQuestion() {
  return (
    <ReportSection title="The question asked">
      <blockquote className={styles.question}>{QUESTION_TEXT}</blockquote>
      <p className={styles.keyStat}>
        Six in ten people globally want AI development slowed in some form. Fewer than one in five want it developed
        &ldquo;as quickly as possible&rdquo;.
      </p>
      <GlobalAverageBar />
      <p className={styles.sourceNote}>
        <a href={SURVEY_META.reportUrl} target="_blank" rel="noreferrer">
          Read the full report
        </a>
        .
      </p>
    </ReportSection>
  );
}
