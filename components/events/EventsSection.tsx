import type { ReactNode } from "react";
import { ButtonAnchor } from "@/components/ui/Button";
import styles from "./EventsSection.module.css";

/**
 * A band of events under a heading, with a link to the calendar beside it
 * if `calendar` is given. The list (an EventList) goes inside. It's white,
 * or the page's cream with `tone="cream"`, to differ from a white neighbour.
 */
export default function EventsSection({
  id,
  heading,
  calendar,
  tone = "white",
  children,
}: {
  id?: string;
  heading: string;
  /** The link to the calendar: its words and where it goes. */
  calendar?: { label: string; href: string };
  tone?: "white" | "cream";
  children: ReactNode;
}) {
  return (
    <section id={id} className={tone === "white" ? `${styles.section} ${styles.white}` : styles.section}>
      <div className="container">
        <div className={styles.headingRow}>
          <h2 className={styles.heading}>{heading}</h2>
          {calendar && (
            <ButtonAnchor
              variant="primary"
              className={styles.cta}
              href={calendar.href}
              target="_blank"
              rel="noreferrer"
            >
              {calendar.label}
            </ButtonAnchor>
          )}
        </div>
        {children}
      </div>
    </section>
  );
}
