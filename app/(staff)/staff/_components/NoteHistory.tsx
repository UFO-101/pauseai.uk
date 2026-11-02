"use client";

import { useState, type ReactNode } from "react";
import { Button } from "@/components/ui/Button";
import { TextArea } from "@/components/ui/Controls";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { Muted } from "@/components/ui/Text";
import { staffCopy } from "@/lib/content/staff-interface";
import { isSaveKey } from "@/lib/notes";
import { staffTime } from "@/lib/staff-time";
import { Card } from "./ui/Grid";
import details from "./Details.module.css";
import styles from "./Notes.module.css";

const copy = staffCopy.notes;

/**
 * A politician's history card, its lines (`children`, each an `li` of the
 * history) newest first, or `empty` when it has none. With `add`, Write a
 * note at its top right puts a draft at the top of the history, as the note
 * will be: the time, `at`, then the field, focused, and under it the label
 * and `writer`, with Add note and Cancel at their right. Ctrl+Enter, or
 * Cmd+Enter on a Mac, adds it too. Cancel takes the draft away; adding it
 * does too, for the page to show the note in its place. Without `add`,
 * there's no button, so no draft.
 */
export default function NoteHistory({
  title,
  id,
  empty,
  politicianId,
  writer,
  at,
  add,
  children,
}: {
  title: string;
  id: string;
  empty: string;
  politicianId: number;
  writer: string;
  at: string;
  add?: (form: FormData) => void | Promise<void>;
  children: ReactNode[];
}) {
  const [drafting, setDrafting] = useState(false);
  return (
    <Card
      span={3}
      look="log"
      title={title}
      id={id}
      action={
        add &&
        !drafting && (
          <Button variant="ghost" size="small" fit type="button" onClick={() => setDrafting(true)}>
            {copy.write}
          </Button>
        )
      }
    >
      {children.length === 0 && !drafting ? (
        <p className={details.none}>{empty}</p>
      ) : (
        <ol className={details.history} aria-label={title}>
          {drafting && (
            <li>
              <span className={details.when}>{staffTime(at)}</span>
              <form
                className={styles.note}
                aria-label={copy.add}
                action={async (form) => {
                  await add!(form);
                  setDrafting(false);
                }}
              >
                <input type="hidden" name="politicianId" value={politicianId} />
                <TextArea
                  name="body"
                  required
                  autoFocus
                  aria-label={copy.note}
                  rows={3}
                  onKeyDown={(event) => {
                    if (!isSaveKey(event)) return;
                    event.preventDefault();
                    event.currentTarget.form!.requestSubmit();
                  }}
                />
                <div className={styles.meta}>
                  <Muted>{`${staffCopy.politician.history.note} · ${writer}`}</Muted>
                  <div className={styles.buttons}>
                    <SubmitButton variant="primary" size="small" fit>
                      {copy.add}
                    </SubmitButton>
                    <Button variant="ghost" size="small" fit type="button" onClick={() => setDrafting(false)}>
                      {copy.cancel}
                    </Button>
                  </div>
                </div>
              </form>
            </li>
          )}
          {children}
        </ol>
      )}
    </Card>
  );
}
