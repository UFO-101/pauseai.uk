"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Select, TextInput } from "@/components/ui/Controls";
import { Field } from "@/components/ui/Field";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { staffCopy } from "@/lib/content/staff-interface";
import { GOOGLE_DOC_PATTERN } from "@/lib/staff-forms";
import styles from "./EventsOverview.module.css";

const copy = staffCopy.events;

/** The Server Action that saves an event's owner and Google Doc. */
export type SaveEvent = (form: FormData) => void | Promise<void>;

/**
 * An event's Edit button, at its row's right, which opens a form under the
 * row: its owner, any staff account, and the link to its Google Doc, only
 * to Google Docs or Drive, blank to clear it; saved together, which closes
 * it. With no owner, that's the select's first choice, which can't be chosen
 * back. Two grid items of the row, the button's cell and the form.
 */
export default function EventEdit({
  event,
  staff,
  save,
}: {
  event: { id: string; name: string; owner: string | null; doc: string | null };
  staff: readonly string[];
  save: SaveEvent;
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <span className={styles.editCell}>
        {!open && (
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
        )}
      </span>
      {open && (
        <form
          className={styles.editor}
          aria-label={copy.editLabel(event.name)}
          action={async (form) => {
            await save(form);
            setOpen(false);
          }}
        >
          <input type="hidden" name="eventId" value={event.id} />
          <Field label={copy.owner}>
            <Select name="owner" defaultValue={event.owner ?? ""} autoFocus>
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
          </Field>
          <Field label={copy.doc}>
            <TextInput
              type="url"
              name="doc"
              defaultValue={event.doc ?? ""}
              pattern={GOOGLE_DOC_PATTERN}
              placeholder={copy.docPlaceholder}
            />
          </Field>
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
    </>
  );
}
