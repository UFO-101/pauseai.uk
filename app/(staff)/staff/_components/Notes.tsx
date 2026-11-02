import { buttonClass } from "@/components/ui/Button";
import { TextArea } from "@/components/ui/Controls";
import { FormStack } from "@/components/ui/Form";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { Muted } from "@/components/ui/Text";
import { staffCopy } from "@/lib/content/staff-interface";
import { canDeleteNote, canEditNote, noteParts, type Note, type NoteReader } from "@/lib/notes";
import { staffTime } from "@/lib/staff-time";
import { DeleteTwice } from "./DeleteTwice";
import { Card } from "./ui/Grid";
import styles from "./Notes.module.css";

const copy = staffCopy.notes;

type Action = (form: FormData) => void | Promise<void>;

/** A note's text, its line breaks kept and each address in it a link, opening in a new tab. */
export function NoteText({ body, className }: { body: string; className?: string }) {
  return (
    <p className={className ?? styles.body}>
      {noteParts(body).map((part, i) =>
        part.href ? (
          <a key={i} href={part.href} target="_blank" rel="noreferrer">
            {part.text}
          </a>
        ) : (
          part.text
        ),
      )}
    </p>
  );
}

/**
 * The notes on a supporter or a politician, newest first, each with who
 * wrote it and when, and whether it's been edited; under one its writer may
 * still change, a fold with the form to edit it, and a button to delete it,
 * which an admin has under every note. Then the form to add one, with a
 * reminder of what a note should be. `target` is the hidden field that says
 * whom they're about: `supporterId` or `politicianId`, and the ID. `at` is
 * the server's time, which says whose notes can still be changed.
 */
export default function Notes({
  notes,
  target,
  reader,
  at,
  add,
  edit,
  remove,
}: {
  notes: Note[];
  target: { name: "supporterId" | "politicianId"; value: number };
  reader: NoteReader;
  at: string;
  add: Action;
  edit: Action;
  remove: Action;
}) {
  const time = new Date(at);
  return (
    <Card span={6} title={copy.title} id="notes-title">
      {notes.length === 0 ? (
        <p className={styles.none}>{copy.none}</p>
      ) : (
        <ol className={styles.notes} aria-labelledby="notes-title">
          {notes.map((note) => {
            const editable = canEditNote(note, reader, time);
            return (
              <li key={note.id} className={styles.note}>
                <NoteText body={note.body} />
                <Muted>
                  {note.writtenBy} · {staffTime(note.createdAt)}
                  {note.editedAt && ` · ${copy.edited}`}
                </Muted>
                {(editable || canDeleteNote(note, reader, time)) && (
                  <div className={styles.changes}>
                    {editable && (
                      // Keyed on the edit, so saving one closes the fold.
                      <details key={note.editedAt} className={styles.edit}>
                        <summary className={buttonClass({ variant: "ghost", size: "small", fit: true })}>
                          {copy.edit}
                        </summary>
                        <FormStack action={edit} aria-label={copy.edit}>
                          <input type="hidden" name="id" value={note.id} />
                          <TextArea name="body" defaultValue={note.body} required aria-label={copy.note} rows={4} />
                          <SubmitButton variant="primary" size="small" fit>
                            {copy.save}
                          </SubmitButton>
                        </FormStack>
                      </details>
                    )}
                    <DeleteTwice name="id" value={String(note.id)} label={copy.delete} action={remove} />
                  </div>
                )}
              </li>
            );
          })}
        </ol>
      )}
      <FormStack action={add} aria-label={copy.add} className={styles.add}>
        <input type="hidden" name={target.name} value={target.value} />
        <TextArea
          name="body"
          required
          aria-label={copy.note}
          aria-describedby="notes-guidance"
          placeholder={copy.placeholder}
          rows={3}
        />
        <p id="notes-guidance" className={styles.guidance}>
          {copy.guidance[target.name]}
        </p>
        <SubmitButton variant="primary" size="small" fit>
          {copy.add}
        </SubmitButton>
      </FormStack>
    </Card>
  );
}
