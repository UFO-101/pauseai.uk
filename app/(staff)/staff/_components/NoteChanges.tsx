"use client";

import { useState, useTransition } from "react";
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
 * The buttons under a note. Its writer, while they may change it, has
 * Edit, which opens the field with its text, focused, and under it Save,
 * Cancel and Delete, red, pressed twice; saving or cancelling closes it.
 * Anyone else who may delete it, an admin, has Delete alone. If the server
 * refuses, as it does once the day is up on a page left open, it stays
 * open and says why.
 */
export default function NoteChanges({
  note,
  editable,
  edit,
  remove,
}: {
  note: { id: number; body: string };
  editable: boolean;
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
  if (!editable) {
    return (
      <div className={styles.buttons}>
        <DeleteTwice name="id" value={String(note.id)} label={copy.delete} action={removing} />
      </div>
    );
  }
  if (!editing) {
    return (
      <div className={styles.buttons}>
        <Button variant="ghost" size="small" fit type="button" onClick={() => setEditing(true)}>
          {copy.edit}
        </Button>
      </div>
    );
  }
  return (
    <div className={styles.editing}>
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
      <div className={styles.buttons}>
        <Button variant="primary" size="small" fit type="submit" form={id} pending={pending}>
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
      </div>
      {refused && (
        <p role="alert" className={styles.refused}>
          <ErrorText>{copy.tooLate[refused]}</ErrorText>
        </p>
      )}
    </div>
  );
}
