"use client";

import { useEffect, useId, useRef, useState, type KeyboardEvent } from "react";
import {
  addDays,
  isDay,
  longDay,
  mondayOf,
  monthsBetween,
  shortDay,
  shortMonth,
  today,
  weeksFrom,
} from "@/lib/calendar-days";
import styles from "./DatePicker.module.css";

const WORDS = {
  choose: "Choose a day",
  calendar: "Choose a day",
  earlier: "Earlier weeks",
  later: "Later weeks",
  clear: "No day",
  today: "today",
};

/** How many weeks the calendar shows, and how far its arrows move it: less than it shows, so the weeks either side stay in view. */
const WEEKS = 6;
const STEP = 4;

const WEEKDAYS = ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"];

/** How far each key moves the focus, in days; Page Up and Down by the arrows' step. */
const MOVES: Record<string, number> = {
  ArrowLeft: -1,
  ArrowRight: 1,
  ArrowUp: -7,
  ArrowDown: 7,
  PageUp: -STEP * 7,
  PageDown: STEP * 7,
};

type Props = {
  /** What a form posts the day as, "yyyy-mm-dd", or "" for none. */
  name?: string;
  /** The day chosen, "yyyy-mm-dd", or "" for none; with `onChange`, the picker shows it. Without, it keeps its own, from `defaultValue`. */
  value?: string;
  defaultValue?: string;
  onChange?: (day: string) => void;
  /** The first day that can be chosen. */
  min?: string;
  /** Whether "No day" is offered: a day can be taken away. */
  clearable?: boolean;
  disabled?: boolean;
  /** Its name when no Field's label names it, as each of a DateRange's two. */
  "aria-label"?: string;
};

/**
 * A day, chosen from a calendar: a button showing the day ("Fri 30 Oct
 * 2026"), which opens weeks of days below it. The weeks run on from one
 * month to the next, so a day near a month's end has the next month's days
 * beside it, and the arrows move a few weeks at a time, never a whole
 * month. Arrow keys, Page Up and Down, Enter, and Escape work as in a
 * grid. Days before `min` can't be chosen.
 */
export default function DatePicker({
  name,
  value,
  defaultValue = "",
  onChange,
  min,
  clearable = false,
  disabled,
  "aria-label": label,
}: Props) {
  const id = useId().replace(/:/g, "");
  const [own, setOwn] = useState(defaultValue);
  const day = value ?? own;
  const chosen = isDay(day) ? day : "";
  const [open, setOpen] = useState(false);
  // The day with the focus, and the first Monday shown, while it's open.
  const [focused, setFocused] = useState(chosen);
  const [start, setStart] = useState(chosen);
  const popover = useRef<HTMLDivElement>(null);
  const button = useRef<HTMLButtonElement>(null);
  const days = useRef(new Map<string, HTMLButtonElement>());
  const now = today();
  const tooSoon = (d: string) => min !== undefined && d < min;

  useEffect(() => {
    if (open) days.current.get(focused)?.focus();
  }, [open, focused]);

  /** Moves the focus to `to`, bringing its week into view if it's out. */
  function focusOn(to: string) {
    setFocused(to);
    const end = addDays(start, WEEKS * 7 - 1);
    if (to < start) setStart(mondayOf(to));
    else if (to > end) setStart(addDays(mondayOf(to), -(WEEKS - 1) * 7));
  }

  function choose(to: string) {
    if (value === undefined) setOwn(to);
    onChange?.(to);
    popover.current!.hidePopover();
    button.current!.focus();
  }

  function onKeyDown(event: KeyboardEvent) {
    const move = MOVES[event.key];
    if (move === undefined) return;
    event.preventDefault();
    focusOn(addDays(focused, move));
  }

  const weeks = weeksFrom(start || mondayOf(now), WEEKS);
  const first = weeks[0][0];
  const last = weeks[WEEKS - 1][6];

  return (
    <span className={styles.picker}>
      {name !== undefined && <input type="hidden" name={name} value={chosen} />}
      <button
        ref={button}
        type="button"
        className={styles.button}
        popoverTarget={id}
        disabled={disabled}
        aria-label={label}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-describedby={`${id}-day`}
        style={{ anchorName: `--${id}` } as React.CSSProperties}
      >
        <span id={`${id}-day`} className={chosen ? undefined : styles.none}>
          {chosen ? shortDay(chosen) : WORDS.choose}
        </span>
        <svg className={styles.icon} viewBox="0 0 24 24" aria-hidden="true">
          <path d="M5 5h14a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2zM3 10h18M8 3v4M16 3v4" />
        </svg>
      </button>
      <div
        ref={popover}
        id={id}
        popover="auto"
        role="dialog"
        aria-label={WORDS.calendar}
        className={styles.calendar}
        style={{ positionAnchor: `--${id}` } as React.CSSProperties}
        onToggle={(event) => {
          const opening = (event.nativeEvent as ToggleEvent).newState === "open";
          if (opening) {
            // From the day chosen, or else today, or the first that can be chosen.
            const from = chosen || (tooSoon(now) ? min! : now);
            setFocused(from);
            setStart(addDays(mondayOf(from), -7));
          }
          setOpen(opening);
        }}
      >
        <div className={styles.head}>
          <button
            type="button"
            className={styles.step}
            aria-label={WORDS.earlier}
            onClick={() => setStart(addDays(first, -STEP * 7))}
          >
            ‹
          </button>
          <span className={styles.months} aria-live="polite">
            {monthsBetween(first, last)}
          </span>
          <button
            type="button"
            className={styles.step}
            aria-label={WORDS.later}
            onClick={() => setStart(addDays(first, STEP * 7))}
          >
            ›
          </button>
        </div>
        <table role="grid" className={styles.grid} aria-label={monthsBetween(first, last)} onKeyDown={onKeyDown}>
          <thead>
            <tr>
              {WEEKDAYS.map((weekday) => (
                <th key={weekday} scope="col">
                  {weekday}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {weeks.map((week) => (
              <tr key={week[0]}>
                {week.map((d) => (
                  <td key={d} aria-selected={d === chosen}>
                    <button
                      ref={(element) => {
                        if (element) days.current.set(d, element);
                        else days.current.delete(d);
                      }}
                      type="button"
                      className={styles.day}
                      // Every other month shaded, so where one ends shows.
                      data-shade={Number(d.slice(5, 7)) % 2 === 0 || undefined}
                      data-today={d === now || undefined}
                      aria-pressed={d === chosen}
                      aria-label={d === now ? `${longDay(d)}, ${WORDS.today}` : longDay(d)}
                      tabIndex={d === focused ? 0 : -1}
                      // Not disabled, which can't take the focus the arrow keys move over it.
                      aria-disabled={tooSoon(d) || undefined}
                      onFocus={() => setFocused(d)}
                      onClick={() => !tooSoon(d) && choose(d)}
                    >
                      {d.endsWith("-01") && <span className={styles.month}>{shortMonth(d)}</span>}
                      {Number(d.slice(8))}
                    </button>
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
        {clearable && chosen && (
          <button type="button" className={styles.clear} onClick={() => choose("")}>
            {WORDS.clear}
          </button>
        )}
      </div>
    </span>
  );
}
