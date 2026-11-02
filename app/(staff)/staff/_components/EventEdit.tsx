"use client";

import { createContext, use, useState, type ReactNode } from "react";
import { Button } from "@/components/ui/Button";
import { Select, TextInput } from "@/components/ui/Controls";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { staffCopy } from "@/lib/content/staff-interface";
import type { EventSaved } from "@/lib/server/staff-events";
import { GOOGLE_DOC_PATTERN } from "@/lib/staff-forms";
import Notice from "./ui/Notice";
import styles from "./EventsTable.module.css";

const copy = staffCopy.events;

/** The Server Action that saves an event's owner and Google Doc, saying whom it emailed. */
export type SaveEvent = (form: FormData) => Promise<EventSaved>;

/** The event being edited, if any, and what the last save emailed, shared by its row's cells. */
type Editing = {
  open: string | null;
  setOpen: (id: string | null) => void;
  setSaved: (saved: EventSaved) => void;
};

// Always given by EventsEditing, round the table.
const EditingContext = createContext<Editing | null>(null);

/** The ID of an event's edit form, which its fields in other cells belong to. */
const formId = (id: string) => `event-edit-${id}`;

/**
 * The events table (`children`), one of whose events can be edited at a
 * time, its fields in its own cells; over it, a save that emailed anyone
 * says so in a Notice, till its × closes it.
 */
export function EventsEditing({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState<string | null>(null);
  const [saved, setSaved] = useState<EventSaved>();
  return (
    <EditingContext value={{ open, setOpen, setSaved }}>
      <span role="status" className={styles.emailed}>
        {saved?.owner && saved.emailed.length > 0 && (
          <Notice close={copy.closeEmailed} onClose={() => setSaved(undefined)}>
            {copy.emailed(saved.emailed, saved.owner)}
          </Notice>
        )}
      </span>
      {children}
    </EditingContext>
  );
}

/**
 * An event's owner cell: who owns it (`children`); while it's being
 * edited, a select of every staff account in its place, part of its edit
 * form. With no owner, that's the select's first choice, which can't be
 * chosen back.
 */
export function OwnerField({
  event,
  staff,
  children,
}: {
  event: { id: string; owner: string | null };
  staff: readonly string[];
  children: ReactNode;
}) {
  if (use(EditingContext)!.open !== event.id) return children;
  return (
    <Select form={formId(event.id)} name="owner" aria-label={copy.owner} defaultValue={event.owner ?? ""} autoFocus>
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
  );
}

/**
 * An event's Google Doc cell: its link (`children`); while it's being
 * edited, a box for it, only a link to Google Docs or Drive, blank to
 * clear it, part of its edit form.
 */
export function DocField({ event, children }: { event: { id: string; doc: string | null }; children: ReactNode }) {
  if (use(EditingContext)!.open !== event.id) return children;
  return (
    <span className={styles.docField}>
      <TextInput
        form={formId(event.id)}
        type="url"
        name="doc"
        aria-label={copy.docField}
        defaultValue={event.doc ?? ""}
        pattern={GOOGLE_DOC_PATTERN}
        placeholder={copy.docPlaceholder}
      />
    </span>
  );
}

/**
 * An event's Edit button, at its row's right, which puts its owner and
 * doc fields in their cells; while they're open, its edit form there
 * instead, with Save, which saves them together and closes them, and
 * Cancel. Opening one closes any other.
 */
export function EventEditButtons({ event, save }: { event: { id: string; name: string }; save: SaveEvent }) {
  const { open, setOpen, setSaved } = use(EditingContext)!;
  if (open !== event.id) {
    return (
      <Button
        variant="ghost"
        size="small"
        fit
        type="button"
        aria-label={copy.editLabel(event.name)}
        onClick={() => setOpen(event.id)}
      >
        {copy.edit}
      </Button>
    );
  }
  return (
    <form
      id={formId(event.id)}
      className={styles.editorButtons}
      aria-label={copy.editLabel(event.name)}
      action={async (form) => {
        setSaved(await save(form));
        setOpen(null);
      }}
    >
      <input type="hidden" name="eventId" value={event.id} />
      <SubmitButton variant="primary" size="small" fit>
        {copy.save}
      </SubmitButton>
      <Button variant="ghost" size="small" fit type="button" onClick={() => setOpen(null)}>
        {copy.cancel}
      </Button>
    </form>
  );
}
