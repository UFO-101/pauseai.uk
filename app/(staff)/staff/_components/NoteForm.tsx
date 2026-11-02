"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { TextArea } from "@/components/ui/Controls";
import { FormStack } from "@/components/ui/Form";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { staffCopy } from "@/lib/content/staff-interface";
import styles from "./Notes.module.css";

const copy = staffCopy.notes;

/**
 * Write a note, a button that opens the form to add one: the field, its
 * focus in it, then Add note and Cancel, which closes it unsent. Adding one
 * closes it too, for the page to show the note. `target` is the hidden
 * field that says whom it's about: `supporterId` or `politicianId`, and the
 * ID. On a supporter, a reminder under the field of what a note about them
 * should be. `opened` shows it open to begin with, without the focus, as
 * the gallery does.
 */
export default function NoteForm({
  target,
  add,
  opened = false,
}: {
  target: { name: "supporterId" | "politicianId"; value: number };
  add: (form: FormData) => void | Promise<void>;
  opened?: boolean;
}) {
  // Closed, open as it began, or opened by its button, which puts the focus in the field.
  const [state, setState] = useState<"closed" | "shown" | "opened">(opened ? "shown" : "closed");
  const setOpen = (open: boolean) => setState(open ? "opened" : "closed");
  if (state === "closed") {
    return (
      <Button variant="ghost" size="small" fit type="button" onClick={() => setOpen(true)}>
        {copy.write}
      </Button>
    );
  }
  const guided = target.name === "supporterId";
  return (
    <FormStack
      action={async (form) => {
        await add(form);
        setOpen(false);
      }}
      aria-label={copy.add}
    >
      <input type="hidden" name={target.name} value={target.value} />
      <TextArea
        name="body"
        required
        autoFocus={state === "opened"}
        aria-label={copy.note}
        aria-describedby={guided ? "note-guidance" : undefined}
        rows={3}
      />
      {guided && (
        <p id="note-guidance" className={styles.guidance}>
          {copy.guidance}
        </p>
      )}
      <div className={styles.buttons}>
        <SubmitButton variant="primary" size="small" fit>
          {copy.add}
        </SubmitButton>
        <Button variant="ghost" size="small" fit type="button" onClick={() => setOpen(false)}>
          {copy.cancel}
        </Button>
      </div>
    </FormStack>
  );
}
