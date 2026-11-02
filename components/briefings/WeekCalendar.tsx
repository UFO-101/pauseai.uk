import { formatPostDate } from "@/lib/content/blog";
import styles from "./WeekCalendar.module.css";

/** A day, as an ISO date, and what happens on it. */
export type CalendarDay = { date: string; events: string[] };

const weekday = (iso: string) =>
  new Date(`${iso}T00:00:00Z`).toLocaleDateString("en-GB", { weekday: "short", timeZone: "UTC" });

/**
 * A working week as a row of days, each with its weekday, its date and what
 * happens on it; a day with something on has its date ringed. On a phone the
 * days are a list, and the days with nothing on are left out.
 */
export default function WeekCalendar({ days }: { days: CalendarDay[] }) {
  return (
    <div className={styles.calendar}>
      <ol className={styles.week}>
        {days.map((day) => (
          <li key={day.date} className={day.events.length > 0 ? styles.busy : styles.free}>
            <time dateTime={day.date} title={formatPostDate(day.date)}>
              <span className={styles.weekday}>{weekday(day.date)}</span>
              <span className={styles.date}>{Number(day.date.slice(8))}</span>
            </time>
            {day.events.length > 0 && (
              <ul className={styles.events}>
                {day.events.map((event) => (
                  <li key={event}>{event}</li>
                ))}
              </ul>
            )}
          </li>
        ))}
      </ol>
    </div>
  );
}
