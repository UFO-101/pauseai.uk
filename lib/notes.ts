import type { Permission } from "@/lib/staff-permissions";

// Notes staff write about a supporter or a politician: who may change one,
// and the links in its text.

export type Note = {
  id: number;
  body: string;
  writtenBy: string;
  createdAt: string;
  editedAt: string | null;
};

/** Who's looking: their email, and their permissions. */
export type NoteReader = { email: string; permissions: readonly Permission[] };

/** How long after writing a note its writer may edit or delete it, as a message app lets you. */
export const NOTE_EDIT_HOURS = 24;

/** Whether `reader` wrote the note, no more than NOTE_EDIT_HOURS before `at`. */
export function canEditNote(note: Pick<Note, "writtenBy" | "createdAt">, reader: NoteReader, at: Date): boolean {
  const age = at.getTime() - new Date(note.createdAt).getTime();
  return note.writtenBy === reader.email && age <= NOTE_EDIT_HOURS * 60 * 60 * 1000;
}

/** Whether `reader` may delete the note: its writer while they may edit it, or an admin at any time. */
export function canDeleteNote(note: Pick<Note, "writtenBy" | "createdAt">, reader: NoteReader, at: Date): boolean {
  return reader.permissions.includes("admin") || canEditNote(note, reader, at);
}

/** A stretch of a note's text: words, or a link, as written and where it leads. */
export type NotePart = { text: string; href?: string };

/** An address on the web, from http://, https:// or www. to the next space. */
const LINK = /\b(?:https?:\/\/|www\.)[^\s<>"]+/gi;
/** What ends a sentence after an address, rather than being part of it. */
const TRAILING = /[.,;:!?'"\])}]+$/;

/**
 * A link written out, without what ends the sentence after it: a full stop
 * or comma, or a closing bracket that opened before it. A bracket opened
 * inside it, as Wikipedia's addresses have, is kept with its closing one.
 */
function trimmed(url: string): string {
  const end = TRAILING.exec(url)?.[0] ?? "";
  let link = url.slice(0, url.length - end.length);
  for (const char of end) {
    const open = { ")": "(", "]": "[", "}": "{" }[char];
    if (!open || link.split(open).length <= link.split(char).length) break;
    link += char;
  }
  return link;
}

/** A note's text, split into words and links; a www. address leads to https://. */
export function noteParts(body: string): NotePart[] {
  const parts: NotePart[] = [];
  let last = 0;
  for (const match of body.matchAll(LINK)) {
    const link = trimmed(match[0]);
    if (match.index > last) parts.push({ text: body.slice(last, match.index) });
    parts.push({ text: link, href: /^www\./i.test(link) ? `https://${link}` : link });
    last = match.index + link.length;
  }
  if (last < body.length) parts.push({ text: body.slice(last) });
  return parts;
}

/** The keys a keyboard event pressed, as a browser's and React's both say. */
type Keys = { key: string; ctrlKey: boolean; metaKey: boolean; altKey: boolean; shiftKey: boolean };

/** Ctrl+Enter, or Cmd+Enter on a Mac: what saves a note from its field. */
export function isSaveKey(event: Keys): boolean {
  return (event.ctrlKey || event.metaKey) && !event.altKey && !event.shiftKey && event.key === "Enter";
}
