import type { ReactNode } from "react";
import { ButtonAnchor } from "@/components/ui/Button";
import styles from "./EventsSection.module.css";

/**
 * A band of events under a heading, with a link to the calendar beside it
 * if `calendar` is given, and any other `actions` before it. The list (an EventList) goes inside. It's white,
 * or the page's cream with `tone="cream"`, to differ from a white neighbour.
 */
export default function EventsSection({
  id,
  heading,
  calendar,
  actions,
  tone = "white",
  children,
}: {
  id?: string;
  heading: string;
  /** The link to the calendar: its words, where it goes, and its look (primary when left out). */
  calendar?: { label: string; href: string; variant?: "primary" | "ghost" };
  /** Buttons for the list, beside the heading before the calendar link. */
  actions?: ReactNode;
  tone?: "white" | "cream";
  children: ReactNode;
}) {
  return (
    <section id={id} className={tone === "white" ? `${styles.section} ${styles.white}` : styles.section}>
      <div className="container">
        <div className={styles.headingRow}>
          <h2 className={styles.heading}>{heading}</h2>
          {(actions || calendar) && (
            <div className={styles.actions}>
              {actions}
              {calendar && (
                <ButtonAnchor
                  variant={calendar.variant ?? "primary"}
                  className={styles.cta}
                  href={calendar.href}
                  target="_blank"
                  rel="noreferrer"
                >
                  {calendar.label}
                </ButtonAnchor>
              )}
            </div>
          )}
        </div>
        {children}
      </div>
    </section>
  );
}
