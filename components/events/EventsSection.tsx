import type { ReactNode } from "react";
import { ButtonAnchor } from "@/components/ui/Button";
import styles from "./EventsSection.module.css";

/**
 * A band of events under a heading, with a link to the calendar beside it
 * if `calendar` is given. The list (an EventList) goes inside.
 */
export default function EventsSection({
  id,
  heading,
  calendar,
  children,
}: {
  id?: string;
  heading: string;
  /** The link to the calendar: its words and where it goes. */
  calendar?: { label: string; href: string };
  children: ReactNode;
}) {
  return (
    <section id={id} className={styles.section}>
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
