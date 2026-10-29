"use client";

import { useEffect, useReducer, useState } from "react";
import { Select, TextInput } from "@/components/ui/Controls";
import { Field } from "@/components/ui/Field";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { staffCopy } from "@/lib/content/staff-interface";
import { earliestHour, fromLondon, hourNotTooSoon, londonDayHour } from "@/lib/staff-time";

const copy = staffCopy.mailingPages;

/** How often a time picker checks the time it shows hasn't become too soon. */
export const CHECK_EVERY = 30_000;

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
        <TextInput
          type="date"
          name={named ? "day" : undefined}
          // Always a day, so Firefox shows no button to clear it.
          required
          min={earliest.day}
          value={day}
          onChange={(event) => {
            const picked = event.target.value;
            onChange(picked, hour === null ? null : hourNotTooSoon(picked, hour, earliest));
          }}
        />
      </Field>
      <Field label={copy.hour} className={hourClass}>
        <Select
          name={named ? "hour" : undefined}
          value={hour ?? ""}
          disabled={!day}
          onChange={(event) => onChange(day, Number(event.target.value))}
        >
          {hour === null && (
            <option value="" disabled>
              {copy.choose}
            </option>
          )}
          {Array.from({ length: 24 }, (_, h) => (
            // On the first day it can go, the hours too soon can't be chosen.
            <option key={h} value={h} disabled={day === earliest.day && h < earliest.hour}>
              {`${String(h).padStart(2, "0")}:00`}
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
      <DueTimeFields
        day={when.day}
        hour={when.hour}
        named
        // A day cleared keeps the one before: the form always has one.
        onChange={(day, hour) => setPicked(day ? { day, hour: hour! } : when)}
      />
      <SubmitButton variant="primary" size="small" fit>
        {copy.saveTime}
      </SubmitButton>
    </form>
  );
}
