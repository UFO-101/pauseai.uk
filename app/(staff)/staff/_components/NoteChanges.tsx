"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/Button";
import { TextArea } from "@/components/ui/Controls";
import { staffCopy } from "@/lib/content/staff-interface";
import { DeleteTwice } from "./DeleteTwice";
import styles from "./Notes.module.css";

const copy = staffCopy.notes;

type Action = (form: FormData) => void | Promise<void>;

/**
 * The buttons under a note. Its writer, while they may change it, has
 * Edit, which opens the field with its text, focused, and under it Save,
 * Cancel and Delete, red, pressed twice; saving or cancelling closes it.
 * Anyone else who may delete it, an admin, has Delete alone.
 */
export default function NoteChanges({
  note,
  editable,
  edit,
  remove,
}: {
  note: { id: number; body: string };
  editable: boolean;
  edit: Action;
  remove: Action;
}) {
  const [editing, setEditing] = useState(false);
  const [pending, startTransition] = useTransition();
  const id = `note-${note.id}-edit`;
  if (!editable) {
    return (
      <div className={styles.buttons}>
        <DeleteTwice name="id" value={String(note.id)} label={copy.delete} action={remove} />
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
            await edit(form);
            setEditing(false);
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
        <Button variant="ghost" size="small" fit type="button" onClick={() => setEditing(false)}>
          {copy.cancel}
        </Button>
        <DeleteTwice name="id" value={String(note.id)} label={copy.delete} action={remove} danger />
      </div>
    </div>
  );
}
