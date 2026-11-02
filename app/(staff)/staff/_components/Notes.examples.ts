import type { Note, NoteReader } from "@/lib/notes";

/** The time the example notes are read at. */
export const exampleNotesAt = "2026-11-02T12:00:00.000Z";

/** Jo, who wrote two of the example notes, and an admin, who wrote none. */
export const exampleNoteWriter: NoteReader = { email: "jo@pauseai.uk", permissions: ["supporters"] };
export const exampleNoteAdmin: NoteReader = { email: "ada@pauseai.uk", permissions: ["supporters", "admin"] };

/**
 * Notes, newest first: one of Jo's an hour old, with a link, which she can
 * still change; one of Sam's, edited; and one of Jo's from last week, too
 * old to change, on two lines.
 */
export const exampleNotes: Note[] = [
  {
    id: 3,
    body: "Spoke at the Leeds meeting, slides at https://example.org/slides/leeds-2026 (shared with the group).",
    writtenBy: "jo@pauseai.uk",
    createdAt: "2026-11-02T11:00:00.000Z",
    editedAt: null,
  },
  {
    id: 2,
    body: "Happy to flyer on Saturdays. See www.example.com/rota",
    writtenBy: "sam@pauseai.uk",
    createdAt: "2026-11-01T15:30:00.000Z",
    editedAt: "2026-11-01T15:40:00.000Z",
  },
  {
    id: 1,
    body: "Met at the Example Fair.\nWants to help with a stall in December.",
    writtenBy: "jo@pauseai.uk",
    createdAt: "2026-10-26T10:00:00.000Z",
    editedAt: null,
  },
];
