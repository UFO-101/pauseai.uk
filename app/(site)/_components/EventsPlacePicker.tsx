"use client";

import { useId, useState, type CSSProperties, type FormEvent, type Ref } from "react";
import { Button } from "@/components/ui/Button";
import { Segmented, TextInput } from "@/components/ui/Controls";
import { Field, FieldError, Label } from "@/components/ui/Field";
import { FilterForm } from "@/components/ui/Form";
import { homeEventsCopy as copy } from "@/lib/content/home-events";
import { localGroups, type LocalGroupName } from "@/lib/content/local-groups";
import type { EventsWhere } from "@/lib/events";
import styles from "./EventsPlacePicker.module.css";

/** A fresh location, as the visitor may have moved since the last; one that takes longer than this to find won't come. */
const LOCATION_OPTIONS: PositionOptions = { timeout: 15 * 1000 };

/**
 * Where to see in-person events near: the device's location, a postcode
 * (looked up by /api/events/place), or a local group. `onChoose`
 * gets the choice. The location is asked for only when the button is
 * pressed, so the browser's prompt follows the press.
 */
export default function EventsPlacePicker({
  ref,
  id,
  where,
  onChoose,
  className,
  style,
}: {
  ref?: Ref<HTMLDivElement>;
  id?: string;
  /** For its place in a layout: HomeEvents hangs it under its button, and measures it to place it. */
  className?: string;
  style?: CSSProperties;
  where: EventsWhere;
  onChoose: (where: EventsWhere) => void;
}) {
  const [postcode, setPostcode] = useState("");
  const [locating, setLocating] = useState(false);
  const [looking, setLooking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const errorId = useId();

  function locate() {
    setError(null);
    if (!navigator.geolocation) return setError(copy.locationFailed);
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        setLocating(false);
        onChoose({ kind: "place", place: { latitude: coords.latitude, longitude: coords.longitude } });
      },
      () => {
        setLocating(false);
        setError(copy.locationFailed);
      },
      LOCATION_OPTIONS,
    );
  }

  async function lookUp(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (!postcode.trim()) return setError(copy.postcodeRequired);
    setLooking(true);
    try {
      const res = await fetch("/api/events/place", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ postcode }),
      });
      const result = await res.json();
      if (!result.ok) return setError(result.message);
      onChoose({ kind: "place", place: result.place, name: result.name });
    } catch {
      setError(copy.postcodeFailed);
    } finally {
      setLooking(false);
    }
  }

  const chosen = where.kind === "group" ? where.name : "";

  return (
    <div
      ref={ref}
      id={id}
      style={style}
      role="group"
      aria-label={copy.pickerLabel}
      data-density="compact"
      className={className ? `${styles.picker} ${className}` : styles.picker}
    >
      <Button variant="ghost" size="small" pending={locating} onClick={locate}>
        <svg
          className={styles.icon}
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          aria-hidden="true"
        >
          <circle cx="12" cy="12" r="7" />
          <circle cx="12" cy="12" r="2" />
          <path d="M12 2v3M12 19v3M2 12h3M19 12h3" />
        </svg>
        {locating ? copy.locating : copy.useLocation}
      </Button>
      <FilterForm onSubmit={lookUp}>
        <Field label={copy.postcodeLabel} className={styles.postcode}>
          <TextInput
            value={postcode}
            onChange={(e) => setPostcode(e.target.value)}
            autoComplete="postal-code"
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? errorId : undefined}
          />
        </Field>
        <Button variant="primary" size="small" type="submit" pending={looking}>
          {copy.postcodeButton}
        </Button>
      </FilterForm>
      {error && (
        <FieldError id={errorId} announce="alert">
          {error}
        </FieldError>
      )}
      <div className={styles.groups}>
        <Label>{copy.groupsLabel}</Label>
        <Segmented<string>
          label={copy.groupsLabel}
          options={localGroups.map((group) => ({ value: group.name, label: group.name }))}
          value={chosen}
          onChange={(value) => onChoose({ kind: "group", name: value as LocalGroupName })}
        />
      </div>
    </div>
  );
}
