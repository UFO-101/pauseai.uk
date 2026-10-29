"use client";

import { useEffect, useReducer, useState } from "react";
import { Select } from "@/components/ui/Controls";
import DatePicker from "@/components/ui/DatePicker";
import { Field } from "@/components/ui/Field";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { staffCopy } from "@/lib/content/staff-interface";
import { earliestHour, fromLondon, hourNotTooSoon, londonClock, londonDayHour, sendsAt } from "@/lib/staff-time";

const copy = staffCopy.mailingPages;

/** How often a time picker checks the time it shows hasn't become too soon. */
export const CHECK_EVERY = 30_000;

/** Whether the sending runs in `hour` on `day`, in London. */
const sends = (day: string, hour: number) => londonDayHour(sendsAt(fromLondon(day, hour))).hour === hour;

/** An hour's choice: when a mailing due then goes, "09:18"; or for one chosen overnight, the hour and when it goes. */
function hourLabel(day: string, hour: number): string {
  const clock = londonClock(sendsAt(fromLondon(day, hour)));
  return sends(day, hour) ? clock : copy.goesAt(`${String(hour).padStart(2, "0")}:00`, clock);
}

/**
 * The hours a mailing can be due at on `day`: those the sending runs in,
 * so overnight ones aren't offered, as a mailing due then would go in the
 * morning. Which those are moves with the clocks. Also `kept`, an hour
 * already chosen, so it shows.
 */
function sendingHours(day: string, kept: number | null): number[] {
  return Array.from({ length: 24 }, (_, h) => h).filter((h) => h === kept || sends(day, h));
}

/**
 * A mailing's day and hour, in London, never too soon: no day before the
 * first it can go, and on that day the hours too soon can't be chosen. A
 * day changed to that one moves an hour too soon on to the first it can go
 * at. With no hour yet, the hour says Choose. `named` gives the controls the
 * names a form posts them by, day and hour.
 */
export function DueTimeFields({
  day,
  hour,
  onChange,
  named,
  dayClass,
  hourClass,
}: {
  day: string;
  hour: number | null;
  onChange: (day: string, hour: number | null) => void;
  named?: boolean;
  dayClass?: string;
  hourClass?: string;
}) {
  const earliest = londonDayHour(earliestHour());
  return (
    <>
      <Field label={copy.day} className={dayClass}>
        <DatePicker
          name={named ? "day" : undefined}
          min={earliest.day}
          value={day}
          onChange={(picked) => onChange(picked, hour === null ? null : hourNotTooSoon(picked, hour, earliest))}
        />
      </Field>
      <Field label={copy.hour} className={hourClass}>
        <Select
          name={named ? "hour" : undefined}
          value={hour ?? ""}
          onChange={(event) => onChange(day, Number(event.target.value))}
        >
          {hour === null && (
            <option value="" disabled>
              {copy.choose}
            </option>
          )}
          {sendingHours(day, hour).map((h) => (
            // On the first day it can go, the hours too soon can't be chosen.
            <option key={h} value={h} disabled={day === earliest.day && h < earliest.hour}>
              {hourLabel(day, h)}
            </option>
          ))}
        </Select>
      </Field>
    </>
  );
}

/**
 * Change the time's form: a scheduled mailing's day and hour, starting at
 * when it goes, or the first hour it can go at once that's too soon, as it
 * becomes while the form is open.
 */
export function ChangeTimeForm({
  id,
  dueAt,
  action,
  className,
}: {
  id: number;
  dueAt: string;
  action: (form: FormData) => void | Promise<void>;
  className?: string;
}) {
  const [picked, setPicked] = useState(() => londonDayHour(dueAt));
  // Each check draws it again, so an hour that's become too soon moves on.
  const [, check] = useReducer((n: number) => n + 1, 0);
  useEffect(() => {
    const timer = setInterval(check, CHECK_EVERY);
    return () => clearInterval(timer);
  }, []);
  const soonest = earliestHour();
  const chosen = fromLondon(picked.day, picked.hour);
  const when = Date.parse(chosen) < Date.parse(soonest) ? londonDayHour(soonest) : picked;
  return (
    <form action={action} className={className}>
      <input type="hidden" name="id" value={id} />
      <DueTimeFields day={when.day} hour={when.hour} named onChange={(day, hour) => setPicked({ day, hour: hour! })} />
      <SubmitButton variant="primary" size="small" fit>
        {copy.saveTime}
      </SubmitButton>
    </form>
  );
}
