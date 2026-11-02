import "server-only";
import { canDeleteNote, canEditNote, type Note, type NoteReader } from "@/lib/notes";
import { now } from "@/lib/now";
import { logChange } from "./audit";
import { query, transaction, type Queryable } from "./db";

// Notes staff write about a supporter or a politician (lib/notes.ts). A
// supporter's are theirs to read only with the `supporters` permission, as
// their page is. The audit log says who added, edited or deleted which
// note, on whom, but not what it said.

/** Whom a note is about. */
export type NoteTarget = { supporterId: number } | { politicianId: number };

const COLUMNS = `id::int AS id, body, written_by AS "writtenBy", created_at AS "createdAt", edited_at AS "editedAt"`;

/** The column and value that find a target's notes. */
function where(target: NoteTarget): [string, number] {
  return "supporterId" in target ? ["supporter_id", target.supporterId] : ["notable_person_id", target.politicianId];
}

/** Whether `reader` may see notes on `target`: anyone on a politician, only with `supporters` on a supporter. */
function mayRead(target: NoteTarget, reader: NoteReader): boolean {
  return !("supporterId" in target) || reader.permissions.includes("supporters");
}

/** The notes on someone, newest first. */
export async function notesOn(target: NoteTarget): Promise<Note[]> {
  const [column, id] = where(target);
  return query<Note>(`SELECT ${COLUMNS} FROM notes WHERE ${column} = $1 ORDER BY created_at DESC, id DESC`, [id]);
}

/** Adds a note on someone, as `reader`; false if they can't, or there's no such person. */
export async function addNote(target: NoteTarget, body: string, reader: NoteReader): Promise<boolean> {
  if (!mayRead(target, reader)) return false;
  const [column, id] = where(target);
  const table = column === "supporter_id" ? "supporters" : "notable_people";
  return transaction(async (db) => {
    const [note] = await query<{ id: number }>(
      `INSERT INTO notes (${column}, body, written_by, created_at) SELECT id, $2, $3, $4 FROM ${table} WHERE id = $1
       RETURNING id::int AS id`,
      [id, body, reader.email, now()],
      db,
    );
    if (!note) return false;
    await logChange(reader.email, "add note", { noteId: note.id, ...target }, db);
    return true;
  });
}

/** A note, locked for changing, with whom it's about. */
async function lockedNote(id: number, db: Queryable): Promise<(Note & { target: NoteTarget }) | undefined> {
  const [row] = await query<Note & { supporterId: number | null; politicianId: number | null }>(
    `SELECT ${COLUMNS}, supporter_id::int AS "supporterId", notable_person_id::int AS "politicianId"
     FROM notes WHERE id = $1 FOR UPDATE`,
    [id],
    db,
  );
  if (!row) return undefined;
  const { supporterId, politicianId, ...note } = row;
  return { ...note, target: supporterId === null ? { politicianId: Number(politicianId) } : { supporterId } };
}

/** What's done to a note: the new text, or nothing, to delete it. */
async function change(id: number, body: string | null, reader: NoteReader): Promise<NoteTarget | undefined> {
  return transaction(async (db) => {
    const note = await lockedNote(id, db);
    if (!note || !mayRead(note.target, reader)) return undefined;
    const at = now();
    if (body === null) {
      if (!canDeleteNote(note, reader, at)) return undefined;
      await query("DELETE FROM notes WHERE id = $1", [id], db);
    } else {
      if (!canEditNote(note, reader, at)) return undefined;
      await query("UPDATE notes SET body = $2, edited_at = $3 WHERE id = $1", [id, body, at], db);
    }
    await logChange(reader.email, body === null ? "delete note" : "edit note", { noteId: id, ...note.target }, db);
    return note.target;
  });
}

/** Changes a note's text, as its writer, while they may (canEditNote); whom it's about, or undefined if not. */
export function editNote(id: number, body: string, reader: NoteReader): Promise<NoteTarget | undefined> {
  return change(id, body, reader);
}

/** Deletes a note, as its writer or an admin (canDeleteNote); whom it was about, or undefined if not. */
export function deleteNote(id: number, reader: NoteReader): Promise<NoteTarget | undefined> {
  return change(id, null, reader);
}
