"use client";

import { createContext, use, useId, useRef, useState, type ReactNode } from "react";
import { Button, buttonClass } from "@/components/ui/Button";
import { Select, TextInput } from "@/components/ui/Controls";
import { Label } from "@/components/ui/Field";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { staffCopy } from "@/lib/content/staff-interface";
import type { EventSaved } from "@/lib/server/staff-events";
import { GOOGLE_DOC_PATTERN } from "@/lib/staff-forms";
import Menu from "./ui/Menu";
import Notice from "./ui/Notice";
import styles from "./EventsTable.module.css";

const copy = staffCopy.events;

/** The Server Action that saves an event's owner and Google Doc, saying whom it emailed. */
export type SaveEvent = (form: FormData) => Promise<EventSaved>;

// Always given by EventsEditing, round the table.
const SavedContext = createContext<((saved: EventSaved) => void) | null>(null);

/**
 * The events table (`children`); over it, a save that emailed anyone says
 * so in a Notice, till its × closes it.
 */
export function EventsEditing({ children }: { children: ReactNode }) {
  const [saved, setSaved] = useState<EventSaved>();
  return (
    <SavedContext value={setSaved}>
      <span role="status" className={styles.emailed}>
        {saved?.owner && saved.emailed.length > 0 && (
          <Notice close={copy.closeEmailed} onClose={() => setSaved(undefined)}>
            {copy.emailed(saved.emailed, saved.owner)}
          </Notice>
        )}
      </span>
      {children}
    </SavedContext>
  );
}

/**
 * An event's Edit button, at its row's right, which opens a bubble under
 * it, over the table, so the row doesn't move: its owner, any staff
 * account, and the link to its Google Doc, only to Google Docs or Drive,
 * blank to clear it; Save, off till they differ from what's saved, saves
 * them together and closes it, and Cancel closes it as it was. With no owner, that's the select's first choice,
 * which can't be chosen back.
 */
export function EventEdit({
  event,
  staff,
  save,
}: {
  event: { id: string; name: string; owner: string | null; doc: string | null };
  staff: readonly string[];
  save: SaveEvent;
}) {
  const setSaved = use(SavedContext)!;
  const form = useRef<HTMLFormElement>(null);
  const ownerId = useId();
  const docId = useId();
  // Whether the fields differ from what's saved, so Save has something to do.
  const [changed, setChanged] = useState(false);
  const differs = () => {
    const data = new FormData(form.current!);
    return (data.get("owner") ?? "") !== (event.owner ?? "") || data.get("doc") !== (event.doc ?? "");
  };
  const close = () => {
    setChanged(false);
    form.current!.closest<HTMLElement>("[popover]")!.hidePopover();
  };
  return (
    <Menu
      id={`event-edit-${event.id}`}
      trigger={buttonClass({ variant: "ghost", size: "small", fit: true })}
      label={copy.edit}
    >
      <form
        ref={form}
        className={styles.editor}
        aria-label={copy.editLabel(event.name)}
        onInput={() => setChanged(differs())}
        action={async (data) => {
          setSaved(await save(data));
          close();
        }}
      >
        <input type="hidden" name="eventId" value={event.id} />
        <Label htmlFor={ownerId}>{copy.owner}</Label>
        <Select id={ownerId} name="owner" defaultValue={event.owner ?? ""}>
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
        <Label htmlFor={docId}>{copy.docField}</Label>
        <TextInput
          id={docId}
          type="url"
          name="doc"
          defaultValue={event.doc ?? ""}
          pattern={GOOGLE_DOC_PATTERN}
          placeholder={copy.docPlaceholder}
        />
        <span className={styles.editorButtons}>
          <SubmitButton variant="primary" size="small" fit disabled={!changed}>
            {copy.save}
          </SubmitButton>
          <Button
            variant="ghost"
            size="small"
            fit
            type="button"
            onClick={() => {
              form.current!.reset();
              close();
            }}
          >
            {copy.cancel}
          </Button>
        </span>
      </form>
    </Menu>
  );
}
