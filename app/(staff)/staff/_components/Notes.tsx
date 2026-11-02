import { Muted } from "@/components/ui/Text";
import { staffCopy } from "@/lib/content/staff-interface";
import { canDeleteNote, canEditNote, noteParts, type Note, type NoteReader } from "@/lib/notes";
import { staffTime } from "@/lib/staff-time";
import NoteChanges from "./NoteChanges";
import NoteForm from "./NoteForm";
import styles from "./Notes.module.css";

const copy = staffCopy.notes;

type Action = (form: FormData) => void | Promise<void>;
/** Changing a note: false when the server refuses, as after a day. */
type Change = (form: FormData) => boolean | void | Promise<boolean | void>;

/** What a page's notes need: the notes, who's reading, the server's time, and the forms' actions. */
export type NotesProps = {
  notes: Note[];
  reader: NoteReader;
  /** The server's time, which says whose notes can still be changed. */
  at: string;
  add: Action;
  edit: Change;
  remove: Change;
};

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
 * One note: its text; under it `label` if there is one, who wrote it, when
 * (unless `dated` is false, where a history gives the time), and whether
 * it's been edited, and at the right of that line, for whoever may change
 * it, its buttons (NoteChanges), Edit putting the field in place of the
 * text.
 */
export function NoteEntry({
  note,
  reader,
  at,
  edit,
  remove,
  label,
  dated = true,
}: Omit<NotesProps, "notes" | "add"> & { note: Note; label?: string; dated?: boolean }) {
  const time = new Date(at);
  const editable = canEditNote(note, reader, time);
  const text = <NoteText body={note.body} />;
  const meta = (
    <Muted>
      {[label, note.writtenBy, dated && staffTime(note.createdAt), note.editedAt && copy.edited]
        .filter(Boolean)
        .join(" · ")}
    </Muted>
  );
  if (editable || canDeleteNote(note, reader, time)) {
    return (
      <NoteChanges
        key={note.editedAt}
        note={note}
        editable={editable}
        text={text}
        meta={meta}
        edit={edit}
        remove={remove}
      />
    );
  }
  return (
    <div className={styles.note}>
      {text}
      <div className={styles.meta}>{meta}</div>
    </div>
  );
}

/**
 * A supporter's notes, a section of their page: newest first, each a
 * NoteEntry, or a line saying there are none; then the form to add one.
 */
export default function Notes({ supporterId, ...props }: NotesProps & { supporterId: number }) {
  return (
    <section aria-labelledby="notes">
      <h2 id="notes">{copy.title}</h2>
      {props.notes.length === 0 ? (
        <p className={styles.none}>{copy.none}</p>
      ) : (
        <ol className={styles.notes} aria-labelledby="notes">
          {props.notes.map((note) => (
            <li key={note.id}>
              <NoteEntry note={note} {...props} />
            </li>
          ))}
        </ol>
      )}
      <div className={styles.add}>
        <NoteForm target={{ name: "supporterId", value: supporterId }} add={props.add} />
      </div>
    </section>
  );
}
