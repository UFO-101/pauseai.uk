"use client";

import { useState, useTransition, type ReactNode } from "react";
import { Button } from "@/components/ui/Button";
import { TextArea } from "@/components/ui/Controls";
import { ErrorText } from "@/components/ui/Text";
import { staffCopy } from "@/lib/content/staff-interface";
import { DeleteTwice } from "./DeleteTwice";
import styles from "./Notes.module.css";

const copy = staffCopy.notes;

/** Changing a note: false when the server refuses, as after a day. */
type Change = (form: FormData) => boolean | void | Promise<boolean | void>;

/**
 * A note that someone may change: `text`, and under it `meta`, who wrote
 * it and when, with its buttons at the right. Its writer, while they may
 * change it, has Edit, which puts the field, with its text, focused, in
 * place of the text, and Save, Cancel and Delete, red, pressed twice, in
 * place of Edit; saving or cancelling puts the text back. Anyone else who
 * may delete it, an admin, has Delete alone. If the server refuses, as it
 * does once the day is up on a page left open, it stays open and says why.
 */
export default function NoteChanges({
  note,
  editable,
  text,
  meta,
  edit,
  remove,
}: {
  note: { id: number; body: string };
  editable: boolean;
  text: ReactNode;
  meta: ReactNode;
  edit: Change;
  remove: Change;
}) {
  const [editing, setEditing] = useState(false);
  const [refused, setRefused] = useState<"edit" | "delete" | null>(null);
  const removing = async (form: FormData) => {
    if ((await remove(form)) === false) setRefused("delete");
  };
  const [pending, startTransition] = useTransition();
  const id = `note-${note.id}-edit`;
  let buttons: ReactNode;
  if (!editable) {
    buttons = <DeleteTwice name="id" value={String(note.id)} label={copy.delete} action={removing} />;
  } else if (!editing) {
    // Keyed, as is Save, so the button clicked isn't reused as Save, a submit button, which the click would then send.
    buttons = (
      <Button key="edit" variant="ghost" size="small" fit type="button" onClick={() => setEditing(true)}>
        {copy.edit}
      </Button>
    );
  } else {
    buttons = (
      <>
        <Button key="save" variant="primary" size="small" fit type="submit" form={id} pending={pending}>
          {copy.save}
        </Button>
        <Button
          variant="ghost"
          size="small"
          fit
          type="button"
          onClick={() => {
            setEditing(false);
            setRefused(null);
          }}
        >
          {copy.cancel}
        </Button>
        <DeleteTwice name="id" value={String(note.id)} label={copy.delete} action={removing} danger />
      </>
    );
  }
  return (
    <div className={styles.note}>
      {editing ? (
        <form
          id={id}
          aria-label={copy.edit}
          action={(form) =>
            startTransition(async () => {
              if ((await edit(form)) === false) setRefused("edit");
              else setEditing(false);
            })
          }
        >
          <input type="hidden" name="id" value={note.id} />
          <TextArea name="body" defaultValue={note.body} required autoFocus aria-label={copy.note} rows={4} />
        </form>
      ) : (
        text
      )}
      <div className={styles.meta}>
        {meta}
        <div className={styles.buttons}>{buttons}</div>
      </div>
      {refused && (
        <p role="alert" className={styles.refused}>
          <ErrorText>{copy.tooLate[refused]}</ErrorText>
        </p>
      )}
    </div>
  );
}
