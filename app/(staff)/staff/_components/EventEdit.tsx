"use client";

import { useId, useState, type ReactNode } from "react";
import { Button } from "@/components/ui/Button";
import { Select, TextInput } from "@/components/ui/Controls";
import { Label } from "@/components/ui/Field";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { staffCopy } from "@/lib/content/staff-interface";
import type { EventSaved } from "@/lib/server/staff-events";
import { GOOGLE_DOC_PATTERN } from "@/lib/staff-forms";
import Notice from "./ui/Notice";
import styles from "./EventsOverview.module.css";

const copy = staffCopy.events;

/** The Server Action that saves an event's owner and Google Doc, saying whom it emailed. */
export type SaveEvent = (form: FormData) => Promise<EventSaved>;

/**
 * An event's owner and doc cells (`children`) and its Edit button, at its
 * row's right, which puts in their place, in the row, a form, its labels on
 * one line and its fields under them, in the same columns: its owner,
 * any staff account, and the link to its Google Doc, only to Google Docs
 * or Drive, blank to clear it; saved together, which closes it. With no
 * owner, that's the select's first choice, which can't be chosen back.
 * A save that emailed anyone says so in a Notice under the event, till its
 * × closes it.
 */
export default function EventEdit({
  event,
  staff,
  save,
  children,
}: {
  event: { id: string; name: string; owner: string | null; doc: string | null };
  staff: readonly string[];
  save: SaveEvent;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  // What the last save emailed, for the note under the event, till its × closes it.
  const [saved, setSaved] = useState<EventSaved>();
  const ownerId = useId();
  const docId = useId();
  return (
    <>
      {!open && (
        <>
          {children}
          <span className={styles.editCell}>
            <Button
              variant="ghost"
              size="small"
              fit
              type="button"
              aria-label={copy.editLabel(event.name)}
              onClick={() => setOpen(true)}
            >
              {copy.edit}
            </Button>
          </span>
        </>
      )}
      {open && (
        <form
          className={styles.editor}
          aria-label={copy.editLabel(event.name)}
          action={async (form) => {
            setSaved(await save(form));
            setOpen(false);
          }}
        >
          <input type="hidden" name="eventId" value={event.id} />
          <span className={styles.ownerLabel}>
            <Label htmlFor={ownerId}>{copy.owner}</Label>
          </span>
          <span className={styles.ownerField}>
            <Select id={ownerId} name="owner" defaultValue={event.owner ?? ""} autoFocus>
              {!event.owner && (
                <option value="" disabled>
                  {copy.noOwner}
                </option>
              )}
              {staff.map((email) => (
                <option key={email} value={email}>
                  {email}
                </option>
              ))}
            </Select>
          </span>
          <span className={styles.docLabel}>
            <Label htmlFor={docId}>{copy.docField}</Label>
          </span>
          <span className={styles.docField}>
            <TextInput
              id={docId}
              type="url"
              name="doc"
              defaultValue={event.doc ?? ""}
              pattern={GOOGLE_DOC_PATTERN}
              placeholder={copy.docPlaceholder}
            />
          </span>
          <span className={styles.editorButtons}>
            <SubmitButton variant="primary" size="small" fit>
              {copy.save}
            </SubmitButton>
            <Button variant="ghost" size="small" fit type="button" onClick={() => setOpen(false)}>
              {copy.cancel}
            </Button>
          </span>
        </form>
      )}
      <span role="status" className={styles.emailed}>
        {saved?.owner && saved.emailed.length > 0 && (
          <Notice close={copy.closeEmailed} onClose={() => setSaved(undefined)}>
            {copy.emailed(saved.emailed, saved.owner)}
          </Notice>
        )}
      </span>
    </>
  );
}
