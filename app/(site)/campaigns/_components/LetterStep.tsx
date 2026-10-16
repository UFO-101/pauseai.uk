import type { ReactNode } from "react";
import styles from "./EmailYourMp.module.css";

/**
 * A page of its own after a campaign's form: writing the letter, the
 * preview, or "sent". One centred column, the letter's width: its heading,
 * then what's on it. Then, full width, anything `after` it.
 */
export default function LetterStep({
  title,
  children,
  after,
}: {
  title: string;
  children: ReactNode;
  after?: ReactNode;
}) {
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
      {after}
    </main>
  );
}
