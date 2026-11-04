import { formatPostDate } from "@/lib/content/blog";
import { toneStyle, type BriefingTone } from "./tone";
import styles from "./WeekCalendar.module.css";

/** Something on a day, dotted in its topic's colour. */
export type CalendarEvent = { what: string; tone: BriefingTone };

/** A day, as an ISO date, and what happens on it. */
export type CalendarDay = { date: string; events: CalendarEvent[] };

const weekday = (iso: string) =>
  new Date(`${iso}T00:00:00Z`).toLocaleDateString("en-GB", { weekday: "short", timeZone: "UTC" });

/**
 * A working week as a row of days, each with its weekday, its date and what
 * happens on it, each event dotted in its topic's colour; a day with
 * something on has its date ringed. On a phone the days are a list, and the
 * days with nothing on are left out.
 */
export default function WeekCalendar({ days }: { days: CalendarDay[] }) {
  return (
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
                <li key={event.what} className={styles.event} style={toneStyle(event.tone)}>
                  {event.what}
                </li>
              ))}
            </ul>
          )}
        </li>
      ))}
    </ol>
  );
}
