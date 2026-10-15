import type { ReactNode } from "react";
import styles from "./EmailYourMp.module.css";

/**
 * A page of its own after a campaign's form: the preview, or "sent". One
 * centred column, the letter's width: its heading, then what's on it.
 */
export default function LetterStep({ title, children }: { title: string; children: ReactNode }) {
  return (
    <main className="campaigns">
      <section className={`campaigns-hero ${styles.step}`}>
        <div className="container">
          <div className={styles.stepColumn}>
            <h1>{title}</h1>
            {children}
          </div>
        </div>
      </section>
    </main>
  );
}
